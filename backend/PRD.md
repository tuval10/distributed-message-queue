# Product Requirements Document: Distributed Message Queue Service

## Executive Summary

This PRD defines the architecture and implementation strategy for a **distributed message queue service** deployed on **Google Cloud Run** with **Redis** as the coordination layer. The service provides a REST API for enqueuing and dequeuing messages across multiple distributed instances.

**Technology Stack**:

- **Compute**: Google Cloud Run (serverless containers)
- **Queue Storage**: Redis (Google Cloud Memorystore or self-hosted)
- **Runtime**: Node.js with TypeScript
- **Architecture**: Stateless REST API + Shared Redis backend

---

## Core Requirements

### 1. REST API Endpoints

**POST /api/{queue_name}**

- Accepts JSON message body
- Adds message to the specified queue
- Returns 201 Created on success
- Queue is created dynamically on first use

**GET /api/{queue_name}?timeout={ms}**

- Retrieves and removes the next message from the queue (FIFO)
- Blocks for up to `timeout` milliseconds waiting for a message
- Default timeout: 10,000ms (10 seconds)
- Returns 200 with message body if available
- Returns 204 No Content if no message after timeout

### 2. Distributed Behavior

- **Multiple Instances**: Cloud Run auto-scales to N instances
- **Single Logical Queue**: All instances share the same queue state via Redis
- **No Duplicates**: Each message delivered exactly once
- **No Message Loss**: Messages persist until successfully dequeued
- **Dynamic Queues**: Queues created automatically, no pre-provisioning

---

## Architecture Overview

### High-Level Architecture

```
                     ┌──────────────────────────────────┐
                     │      Internet / Load Balancer     │
                     └────────────────┬─────────────────┘
                                      │
                     ┌────────────────▼─────────────────┐
                     │         Cloud Run Service         │
                     │   (Auto-scaling Containers)       │
                     │                                   │
                     │  ┌──────┐  ┌──────┐  ┌──────┐   │
                     │  │ REST │  │ REST │  │ REST │   │
                     │  │ API  │  │ API  │  │ API  │   │
                     │  │ 1-N  │  │ ...  │  │ ...  │   │
                     │  └──┬───┘  └──┬───┘  └──┬───┘   │
                     └─────┼─────────┼─────────┼────────┘
                           │         │         │
                           └─────────┼─────────┘
                                     │
                     ┌───────────────▼───────────────┐
                     │      Serverless VPC Access    │
                     │         Connector             │
                     └───────────────┬───────────────┘
                                     │
                     ┌───────────────▼───────────────┐
                     │   Redis (Memorystore)         │
                     │   or Self-Hosted Redis        │
                     │                                │
                     │   Queue Storage & Operations  │
                     └───────────────────────────────┘
```

### Why Cloud Run + Redis?

**Cloud Run Benefits**:

- ✅ **Serverless**: No server management, auto-scaling, pay-per-use
- ✅ **Stateless**: Perfect fit for REST API pattern
- ✅ **Auto-scaling**: Scales to zero when idle, scales up on demand
- ✅ **Fast deployments**: Container-based CI/CD
- ✅ **Built-in HTTPS**: Automatic SSL/TLS certificates
- ✅ **Cost-effective**: Only pay for actual request processing time

**Redis Benefits**:

- ✅ **Perfect queue semantics**: LIST operations (`LPUSH`/`BRPOP`) match requirements exactly
- ✅ **Blocking operations**: `BRPOP` provides native timeout support
- ✅ **Atomic operations**: Prevents race conditions and duplicates
- ✅ **Sub-millisecond latency**: Extremely fast queue operations
- ✅ **Simple implementation**: Minimal code, well-documented patterns

---

## Implementation Strategy

### Redis Queue Operations

**Queue Naming Convention**:

```
queue:{queue_name}
```

**POST /api/{queue_name} Implementation**:

```typescript
// Add message to the tail of the list (FIFO)
await redis.lpush(`queue:${queueName}`, JSON.stringify(message));
```

**GET /api/{queue_name}?timeout={ms} Implementation**:

```typescript
// Block until message available or timeout (in seconds)
const timeoutSeconds = Math.floor(timeout / 1000);
const result = await redis.brpop(`queue:${queueName}`, timeoutSeconds);

if (result) {
  const [key, message] = result;
  return JSON.parse(message); // 200 OK
} else {
  return null; // 204 No Content
}
```

### Key Design Decisions

1. **FIFO Semantics**:

   - `LPUSH` adds to head (left)
   - `BRPOP` removes from tail (right)
   - Result: First in, first out

2. **Blocking Reads**:

   - `BRPOP` blocks until message available or timeout
   - Single atomic operation prevents duplicates
   - Multiple Cloud Run instances can safely call `BRPOP` concurrently

3. **Dynamic Queue Creation**:

   - Redis creates keys automatically on first `LPUSH`
   - No pre-provisioning or queue management needed
   - Keys expire naturally if unused (optional: set TTL)

4. **Message Format**:

   - Store messages as JSON strings in Redis
   - Parse on retrieval
   - Supports arbitrary JSON payloads

5. **Connection Management**:
   - Use connection pooling (ioredis library)
   - Reuse connections across requests in same container
   - Handle cold starts gracefully

---

## Cloud Run Configuration

### Container Specifications

**Resource Limits**:

- **CPU**: 1 vCPU (default)
- **Memory**: 512 MB - 1 GB (sufficient for REST API)
- **Concurrency**: 80 concurrent requests per instance (default)
- **Timeout**: 60 seconds (max timeout for GET requests)

**Auto-scaling**:

- **Min instances**: 0 (scale to zero when idle)
- **Max instances**: 100 (or based on expected load)
- **Target CPU utilization**: 80%

**Environment Variables**:

```
REDIS_HOST=<memorystore-ip>
REDIS_PORT=6379
DEFAULT_TIMEOUT=10000
NODE_ENV=production
```

### VPC Access Configuration

Cloud Run requires **Serverless VPC Access Connector** to reach Redis:

```
Cloud Run → VPC Connector → VPC Network → Redis (Memorystore)
```

**Why VPC Connector?**

- Redis should NOT be exposed to public internet (security)
- Private IP addresses require VPC connectivity
- VPC connector adds ~1-2ms latency (acceptable trade-off)

---

## Redis Deployment Options

### Option 1: Google Cloud Memorystore (Recommended for Production)

**Features**:

- Fully managed Redis service
- High availability with automatic failover
- Automatic backups and maintenance
- 99.9% uptime SLA
- VPC-native (private IP)

**Tiers**:

- **Basic**: Single instance, no replication (dev/test)
- **Standard**: Primary + replica with automatic failover (production)

**Sizing**:

- Start with 1 GB instance
- Monitor memory usage and scale up as needed
- Redis uses ~1 KB per message on average

**Trade-offs**:

- ✅ Zero operational overhead
- ✅ High availability
- ❌ Higher cost (~$50-100/month for basic tier)
- ❌ Slightly higher latency vs. co-located Redis (~1-3ms)

### Option 2: Self-Hosted Redis on Compute Engine

**Features**:

- Full control over Redis configuration
- Cost-effective for development
- Custom persistence settings (AOF, RDB)

**Setup**:

1. Create GCE VM in same VPC as VPC connector
2. Install Redis
3. Configure private IP access
4. Set up monitoring and backups

**Trade-offs**:

- ✅ Lower cost (~$20/month for small VM)
- ✅ Full configuration control
- ❌ Manual maintenance and updates
- ❌ No automatic failover (single point of failure)
- ❌ Requires ops knowledge

### Option 3: Redis on GKE

**When to use**:

- Already deploying other services on Kubernetes
- Need advanced Redis configurations (clustering, sentinel)
- Want to standardize on Kubernetes for all services

**Trade-offs**:

- ✅ Kubernetes-native deployment
- ✅ Can use Redis Operator for HA
- ❌ Kubernetes management overhead
- ❌ More complex than Memorystore

---

## Connection Management

### Redis Client Configuration

```typescript
import Redis from "ioredis";

// Singleton pattern for connection reuse within container
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || "6379"),

      // Connection pool settings
      enableOfflineQueue: false, // Fail fast if Redis unavailable
      lazyConnect: false, // Connect immediately on startup

      // Retry strategy
      retryStrategy: (times) => {
        if (times > 3) {
          // Give up after 3 retries
          return null;
        }
        // Exponential backoff: 50ms, 100ms, 200ms
        return Math.min(times * 50, 2000);
      },

      // Request timeout
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,

      // Keep-alive
      keepAlive: 30000,
    });

    // Error handling
    redisClient.on("error", (err) => {
      console.error("Redis connection error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Connected to Redis");
    });
  }

  return redisClient;
}
```

### Cold Start Handling

**Cold Start**: First request to a new Cloud Run container takes longer

**Timeline**:

- Container initialization: ~500ms
- Redis connection: ~50-100ms
- First request total: ~1-2s

**Mitigation Strategies**:

1. **Min instances**: Set min instances > 0 to keep warm containers
2. **Lazy loading**: Accept first request latency for cost savings
3. **Health checks**: Implement `/health` endpoint to warm up connections

**Recommendation**: Accept cold starts for cost savings (serverless benefit)

---

## API Implementation

### Express Server Example

```typescript
import express from "express";
import { getRedisClient } from "./redis";

const app = express();
app.use(express.json());

const redis = getRedisClient();

// POST /api/{queue_name}
app.post("/api/:queueName", async (req, res) => {
  try {
    const { queueName } = req.params;
    const message = req.body;

    // Validate queue name
    if (!/^[a-zA-Z0-9_-]+$/.test(queueName)) {
      return res.status(400).json({ error: "Invalid queue name" });
    }

    // Add message to queue
    await redis.lpush(`queue:${queueName}`, JSON.stringify(message));

    res.status(201).json({
      success: true,
      queue: queueName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Enqueue error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/{queue_name}?timeout={ms}
app.get("/api/:queueName", async (req, res) => {
  try {
    const { queueName } = req.params;
    const timeout = parseInt(req.query.timeout as string) || 10000;

    // Validate
    if (!/^[a-zA-Z0-9_-]+$/.test(queueName)) {
      return res.status(400).json({ error: "Invalid queue name" });
    }

    if (timeout > 60000) {
      return res.status(400).json({
        error: "Timeout exceeds maximum (60s)",
      });
    }

    // Block for message (timeout in seconds)
    const timeoutSeconds = Math.floor(timeout / 1000);
    const result = await redis.brpop(`queue:${queueName}`, timeoutSeconds);

    if (result) {
      const [key, messageStr] = result;
      const message = JSON.parse(messageStr);
      res.status(200).json(message);
    } else {
      res.status(204).send(); // No content
    }
  } catch (error) {
    console.error("Dequeue error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check for Cloud Run
app.get("/health", (req, res) => {
  if (redis.status === "ready") {
    res.status(200).json({ status: "healthy" });
  } else {
    res.status(503).json({ status: "unhealthy", redis: redis.status });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
```

---

## Edge Cases & Error Handling

### Empty Queue with Timeout

**Scenario**: GET request when queue is empty

**Behavior**:

- `BRPOP` blocks for timeout duration
- Returns `null` if no message arrives
- API returns 204 No Content

**Client Experience**:

- Request takes full timeout duration
- Should implement client-side timeout handling

### Redis Connection Loss

**Scenario**: Redis becomes unavailable

**Behavior**:

- POST requests fail with 500 Internal Server Error
- GET requests fail with 500 Internal Server Error
- Cloud Run marks container as unhealthy (via health check)
- Cloud Run automatically restarts container

**Mitigation**:

- Use Redis Standard tier (automatic failover)
- Implement retry logic in client
- Monitor Redis health metrics

### Cloud Run Timeout

**Scenario**: Long-running GET request exceeds Cloud Run timeout

**Constraint**: Cloud Run max timeout is 60 minutes (configurable)

**Design Decision**:

- Limit GET timeout to 60 seconds maximum
- Recommend client timeout < 30 seconds for better UX
- Client should retry if needed

### Message Format Errors

**Scenario**: Invalid JSON in message

**Behavior**:

- POST validates JSON body (Express middleware)
- Returns 400 Bad Request for invalid JSON
- GET may fail to parse stored message

**Mitigation**:

- Always validate JSON on POST
- Consider schema validation (JSON Schema, Zod)
- Add error handling for JSON.parse in GET

### Concurrent Dequeue

**Scenario**: Multiple Cloud Run instances call GET simultaneously

**Behavior**:

- `BRPOP` is atomic across all clients
- Only one client receives each message
- No duplicates possible

**Why it works**:

- Redis single-threaded execution model
- `BRPOP` removes message atomically
- Perfect for distributed queue semantics

---

## Monitoring & Observability

### Cloud Run Metrics (GCP Console)

**Request Metrics**:

- Request count (rate, total)
- Request latency (p50, p95, p99)
- Error rate (4xx, 5xx)

**Instance Metrics**:

- Active instances count
- Cold start frequency
- CPU/Memory utilization
- Container startup time

**Billable Metrics**:

- Request count
- CPU-seconds
- Memory-GB-seconds

### Redis Metrics

**Memorystore Metrics** (if using Cloud Memorystore):

- Memory usage
- Connected clients
- Operations per second
- Cache hit ratio
- Evicted keys

**Custom Application Metrics**:

```typescript
// Track queue depth
async function getQueueDepth(queueName: string): Promise<number> {
  return redis.llen(`queue:${queueName}`);
}

// Track message age
async function getOldestMessageAge(queueName: string): Promise<number> {
  // Implement using Redis timestamps in message metadata
}
```

### Logging Strategy

**Structured Logging** (Cloud Logging):

```typescript
// Log enqueue
console.log(
  JSON.stringify({
    severity: "INFO",
    message: "Message enqueued",
    queue: queueName,
    messageId: generateId(),
    timestamp: new Date().toISOString(),
  })
);

// Log dequeue
console.log(
  JSON.stringify({
    severity: "INFO",
    message: "Message dequeued",
    queue: queueName,
    waitTime: duration,
    timestamp: new Date().toISOString(),
  })
);

// Log errors
console.error(
  JSON.stringify({
    severity: "ERROR",
    message: "Redis connection failed",
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  })
);
```

### Alerting

**Critical Alerts**:

- Redis connection errors > 5% of requests
- HTTP 5xx errors > 1% of requests
- P99 latency > 5 seconds
- Redis memory usage > 90%

**Warning Alerts**:

- Average queue depth > 1000 messages
- Cold start rate > 10% of requests
- Redis CPU > 80%

---

## Performance Characteristics

### Latency Breakdown

**POST /api/{queue_name}** (Enqueue):

- Cloud Run processing: ~1-2ms
- VPC connector transit: ~1-2ms
- Redis LPUSH: ~0.5-1ms
- **Total**: ~5-10ms (typical)
- **Cold start**: +1-2s (first request to new container)

**GET /api/{queue_name}** (Dequeue):

- Cloud Run processing: ~1-2ms
- VPC connector transit: ~1-2ms
- Redis BRPOP: ~0.5-1ms (message ready) or timeout duration (empty queue)
- **Total**: ~5-10ms (message ready)
- **Total**: timeout duration (empty queue)

### Throughput

**Single Cloud Run Instance**:

- Enqueue rate: ~500-1000 req/s (Redis limited)
- Dequeue rate: ~100-500 req/s (depends on timeout usage)

**Auto-scaled Cloud Run**:

- Enqueue rate: ~10K-50K req/s (Redis becomes bottleneck)
- Dequeue rate: ~5K-10K req/s

**Redis Capacity** (Memorystore 1GB Basic):

- Operations: ~100K ops/s
- Queue depth: ~1M messages (assuming 1KB per message)
- Connected clients: 10K+ (limited by memory, not connections)

### Cost Estimates

**Cloud Run** (example: 10K requests/day):

- Request cost: $0.40/million requests
- CPU cost: $0.00002400/vCPU-second
- Memory cost: $0.00000250/GiB-second
- **Estimated**: ~$5-10/month (low traffic)

**Cloud Memorystore Redis** (1GB Standard tier):

- **Cost**: ~$100/month (standard tier with HA)
- **Cost**: ~$50/month (basic tier, no HA)

**Total Monthly Cost** (low traffic):

- Cloud Run: $10
- Memorystore Basic: $50
- **Total**: ~$60/month

**Total Monthly Cost** (medium traffic, 1M requests/day):

- Cloud Run: $50-100
- Memorystore Standard: $100
- **Total**: ~$150-200/month

---

## Deployment Strategy

### CI/CD Pipeline

**Build & Deploy Flow**:

1. **Build**: Docker image with Node.js application
2. **Push**: Upload image to Google Container Registry (GCR)
3. **Deploy**: Deploy to Cloud Run with configuration
4. **Test**: Smoke tests against deployed endpoint
5. **Monitor**: Check metrics and logs

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Run as non-root user
USER node

# Cloud Run expects PORT env var
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
```

### Deployment Command

```bash
# Build and deploy to Cloud Run
gcloud run deploy message-queue-api \
  --image=gcr.io/PROJECT_ID/message-queue-api:latest \
  --region=us-central1 \
  --platform=managed \
  --vpc-connector=redis-vpc-connector \
  --set-env-vars="REDIS_HOST=10.0.0.3,REDIS_PORT=6379" \
  --min-instances=0 \
  --max-instances=100 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=60s \
  --concurrency=80 \
  --allow-unauthenticated
```

### Infrastructure as Code

**Terraform Example**:

```hcl
# Redis instance
resource "google_redis_instance" "queue" {
  name           = "message-queue-redis"
  tier           = "STANDARD_HA"
  memory_size_gb = 1
  region         = "us-central1"

  authorized_network = google_compute_network.vpc.id
}

# VPC Connector
resource "google_vpc_access_connector" "connector" {
  name          = "redis-vpc-connector"
  region        = "us-central1"
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.8.0.0/28"
}

# Cloud Run service
resource "google_cloud_run_service" "api" {
  name     = "message-queue-api"
  location = "us-central1"

  template {
    spec {
      containers {
        image = "gcr.io/PROJECT_ID/message-queue-api:latest"

        env {
          name  = "REDIS_HOST"
          value = google_redis_instance.queue.host
        }

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }
      }

      container_concurrency = 80
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale"      = "0"
        "autoscaling.knative.dev/maxScale"      = "100"
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.connector.id
      }
    }
  }
}
```

---

## Trade-offs & Design Decisions

### Architecture Trade-offs

| Trade-off                          | Decision               | Reasoning                                                     |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------- |
| **Serverless vs. Always-On**       | Serverless (Cloud Run) | Auto-scaling, cost-effective, no server management            |
| **Durability vs. Performance**     | Performance (Redis)    | Acceptable for demo; Redis AOF available if needed            |
| **Managed vs. Self-Hosted Redis**  | Memorystore (managed)  | Production reliability worth higher cost                      |
| **VPC Connector vs. Public Redis** | VPC Connector          | Security and low latency more important than setup simplicity |
| **Cold Starts vs. Cost**           | Accept cold starts     | Trade 1-2s latency for zero cost when idle                    |
| **Simplicity vs. Features**        | Simplicity             | Redis LIST operations meet all requirements                   |

### Why Not Other Options?

**Why Not Cloud Tasks?**

- Cloud Tasks is pull-based queue service
- Doesn't support timeout-based GET pattern
- Designed for task scheduling, not real-time queuing

**Why Not Pub/Sub?**

- Pub/Sub is for pub/sub messaging (1-to-many)
- Not suitable for point-to-point queue (1-to-1)
- More complex than needed

**Why Not Firestore?**

- Database, not purpose-built for queuing
- Higher latency than Redis
- Requires polling (no blocking reads)

---

## Testing Strategy

### Unit Tests

**Test Coverage**:

- Queue operations (enqueue, dequeue)
- Error handling (invalid input, Redis errors)
- Timeout behavior
- JSON serialization/deserialization

### Integration Tests

**Test Scenarios**:

- End-to-end API tests with real Redis
- Concurrent dequeue (multiple clients)
- Empty queue timeout behavior
- Large message payloads
- Queue isolation (different queue names)

### Load Tests

**Tools**: Apache JMeter, k6, or Locust

**Test Scenarios**:

- Sustained load: 100 req/s for 10 minutes
- Burst traffic: 1000 req/s for 1 minute
- Cold start impact: Scale from 0 instances
- Concurrent consumers: 100 simultaneous GET requests

---

## Security Considerations

### Network Security

**VPC Configuration**:

- Redis in private VPC (no public IP)
- VPC connector for Cloud Run access
- Firewall rules restrict Redis access to VPC

**Cloud Run Security**:

- HTTPS enforced by default
- Optional: Require authentication (Cloud IAM)
- Optional: Allow only specific origins (CORS)

### Data Security

**At Rest**:

- Memorystore encrypts data at rest automatically
- Backups encrypted

**In Transit**:

- HTTPS for API requests
- Redis connection can use TLS (optional)

### Authentication & Authorization

**Options**:

1. **Public API** (current design):

   - No authentication required
   - Suitable for demo/development
   - ❌ Anyone can access queues

2. **Cloud IAM**:

   - Require authenticated requests
   - Use service accounts
   - ✅ Secure for production

3. **API Key**:
   - Custom API key validation
   - Stored in environment variables
   - ✅ Simple authentication

**Recommendation**: Start with public API for demo, add Cloud IAM for production

---

## Future Enhancements

### Phase 1: Core MVP (Current)

- ✅ POST /GET endpoints
- ✅ Redis backend
- ✅ Cloud Run deployment
- ✅ Basic monitoring

### Phase 2: Production Readiness

- Dead Letter Queue (DLQ) for failed messages
- Message TTL / expiration
- Queue statistics API (depth, message rate)
- Authentication (Cloud IAM)
- Rate limiting per queue

### Phase 3: Advanced Features

- Message priorities
- Batch operations (enqueue/dequeue multiple messages)
- Queue filtering / routing
- Message replay / reprocessing
- Webhook notifications on message arrival

### Phase 4: Observability

- Distributed tracing (Cloud Trace)
- Custom metrics dashboard
- Real-time queue monitoring UI
- Anomaly detection and alerting

---

## Appendix: Quick Start Guide

### Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Start local Redis
docker run -d -p 6379:6379 redis:7-alpine

# 3. Set environment variables
export REDIS_HOST=localhost
export REDIS_PORT=6379

# 4. Run development server
npm run dev
```

### Testing Locally

```bash
# Enqueue a message
curl -X POST http://localhost:8080/api/myqueue \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, World!"}'

# Dequeue a message (with timeout)
curl http://localhost:8080/api/myqueue?timeout=5000
```

### Deploy to GCP

```bash
# 1. Build Docker image
docker build -t gcr.io/PROJECT_ID/message-queue-api .

# 2. Push to Container Registry
docker push gcr.io/PROJECT_ID/message-queue-api

# 3. Deploy to Cloud Run
gcloud run deploy message-queue-api \
  --image=gcr.io/PROJECT_ID/message-queue-api \
  --region=us-central1 \
  --vpc-connector=redis-vpc-connector \
  --set-env-vars="REDIS_HOST=<redis-ip>,REDIS_PORT=6379"
```

---

## Conclusion

This PRD defines a **production-ready distributed message queue service** using:

- **Google Cloud Run**: Serverless, auto-scaling REST API
- **Redis**: High-performance queue storage with perfect semantics
- **TypeScript**: Type-safe implementation
- **GCP-native**: Leverages Google Cloud services while remaining portable

**Key Strengths**:

- ✅ Sub-10ms latency for queue operations
- ✅ Auto-scales from 0 to 100+ instances
- ✅ Atomic operations prevent duplicates
- ✅ Simple implementation, minimal code
- ✅ Cost-effective serverless pricing

**Ideal For**:

- Prototypes and demos
- Startups with variable traffic
- Microservices architectures
- Systems prioritizing simplicity and speed

The architecture balances **simplicity, performance, and cost** while meeting all core requirements for a distributed message queue.
