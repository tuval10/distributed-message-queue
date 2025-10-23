# Distributed Message Queue Service - Backend

A **production-ready distributed message queue service** built with NestJS, Redis, and TypeScript. Designed for deployment on Google Cloud Run with auto-scaling capabilities.

## 🚀 Features

### Two API Interfaces

1. **Simple API** (from PRD) - Basic enqueue/dequeue operations

   - `POST /api/{queue_name}` - Enqueue message
   - `GET /api/{queue_name}?timeout={ms}` - Dequeue message

2. **Internal API** (full management) - Complete queue management
   - Message operations (enqueue, dequeue, peek, bulk)
   - Queue management (list, info, delete, purge)
   - System statistics and metrics
   - Health checks

### Key Capabilities

- ✅ **Distributed**: Multiple instances share queue state via Redis
- ✅ **FIFO Semantics**: First-in, first-out message delivery
- ✅ **Atomic Operations**: No duplicates, no message loss
- ✅ **Blocking Reads**: Efficient long-polling with configurable timeouts
- ✅ **Dynamic Queues**: Queues created automatically on first use
- ✅ **Statistics Tracking**: Monitor enqueue/dequeue rates and queue depth
- ✅ **Sub-10ms Latency**: Extremely fast queue operations
- ✅ **Auto-scaling Ready**: Stateless design for Cloud Run

## 📋 Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Redis (local or remote)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Redis

```bash
# Using Docker (recommended)
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Or using Homebrew (macOS)
brew install redis && brew services start redis
```

### 3. Configure Environment

The `.env` file is already configured with defaults. Edit if needed:

```bash
# Application
PORT=3000
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 4. Start the Server

```bash
# Development mode (hot reload)
pnpm run start:dev

# Production mode
pnpm run build && pnpm run start:prod
```

### 5. Test the API

```bash
# Health check
curl http://localhost:3000/health

# Enqueue a message
curl -X POST http://localhost:3000/api/myqueue \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, World!"}'

# Dequeue the message
curl http://localhost:3000/api/myqueue?timeout=5000

# Run full test suite
./test-api.sh
```

## 📚 Documentation

- **[Quick Start Guide](QUICK_START.md)** - Get started in 5 minutes
- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference
- **[Environment Setup](ENV_SETUP.md)** - Configuration guide
- **[PRD](PRD.md)** - Product requirements and architecture
- **[Internal Controller Spec](internal_controller.md)** - Detailed API specification

## 🏗️ Architecture

### Technology Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: NestJS (Express-based)
- **Queue Storage**: Redis (LIST operations)
- **Validation**: class-validator, class-transformer
- **Deployment**: Docker + Google Cloud Run

### Redis Data Structure

```
queue:{queue_name}                     - LIST: Messages (FIFO)
queue:{queue_name}:stats:enqueued      - INT: Total enqueued
queue:{queue_name}:stats:dequeued      - INT: Total dequeued
```

### Message Format

```typescript
{
  "id": "msg_abc123",              // Unique message ID
  "payload": { ... },               // User's message data
  "enqueuedAt": "2025-10-23T...",  // ISO timestamp
  "dequeuedAt": "2025-10-23T..."   // Set when dequeued
}
```

## 🔌 API Examples

### Simple API

```bash
# Enqueue
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": 12345, "amount": 99.99}'

# Dequeue (blocking)
curl http://localhost:3000/api/orders?timeout=10000
```

### Internal API

```bash
# Enqueue with metadata
curl -X POST http://localhost:3000/internal/queues/orders/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Order #12345",
    "priority": "high",
    "metadata": {"userId": 123}
  }'

# Peek at messages (non-destructive)
curl http://localhost:3000/internal/queues/orders/messages/peek?count=5

# Bulk enqueue
curl -X POST http://localhost:3000/internal/queues/orders/messages/bulk \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"message": "Order 1"}, {"message": "Order 2"}]}'

# List all queues
curl http://localhost:3000/internal/queues

# Get queue info
curl http://localhost:3000/internal/queues/orders

# System stats
curl http://localhost:3000/api/stats
```

## 🧪 Testing

```bash
# Run unit tests
pnpm run test

# Run e2e tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov

# API integration tests
./test-api.sh
```

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t message-queue-api .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e REDIS_HOST=your-redis-host \
  -e REDIS_PORT=6379 \
  -e NODE_ENV=production \
  message-queue-api
```

## ☁️ Cloud Run Deployment

### Prerequisites

- Google Cloud Project
- VPC with Redis (Memorystore)
- Serverless VPC Access Connector

### Deploy

```bash
# Build and push image
docker build -t gcr.io/PROJECT_ID/message-queue-api .
docker push gcr.io/PROJECT_ID/message-queue-api

# Deploy to Cloud Run
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

## 📊 Performance

- **Enqueue Latency**: ~5-10ms
- **Dequeue Latency**: ~5-10ms (message ready) or timeout duration (empty queue)
- **Throughput**: ~500-1000 req/s per instance
- **Cold Start**: ~1-2s (first request to new Cloud Run container)

## 🛠️ Development

```bash
# Development mode (watch mode)
pnpm run start:dev

# Build
pnpm run build

# Format code
pnpm run format

# Lint
pnpm run lint

# Type check
tsc --noEmit
```

## 🔍 Monitoring

### Redis CLI

```bash
# Connect to Redis
redis-cli

# View all queues
KEYS queue:*

# Check queue depth
LLEN queue:myqueue

# View messages
LRANGE queue:myqueue 0 -1

# Check stats
GET queue:myqueue:stats:enqueued
```

### Health Endpoint

```bash
curl http://localhost:3000/health
```

### System Statistics

```bash
curl http://localhost:3000/api/stats
```

## 🔐 Security

- **VPC-only Redis**: No public exposure
- **CORS Configuration**: Controlled origins
- **Input Validation**: All inputs validated with class-validator
- **Rate Limiting**: Optional (can be added with express-rate-limit)
- **Authentication**: Can be added with JWT or Cloud IAM

## 📝 Project Structure

```
backend/
├── src/
│   ├── controllers/       # API endpoints
│   │   ├── api.controller.ts       # Simple API (PRD)
│   │   ├── internal.controller.ts  # Full management API
│   │   └── health.controller.ts    # Health checks
│   ├── redis/            # Redis integration
│   │   ├── redis.module.ts
│   │   └── redis.service.ts
│   ├── dto/              # Data transfer objects
│   ├── types/            # TypeScript types
│   ├── utils/            # Helper functions
│   ├── app.module.ts     # Main app module
│   └── main.ts           # Entry point
├── test/                 # Tests
├── .env                  # Environment variables (gitignored)
├── .env.example          # Environment template
└── API_DOCUMENTATION.md  # Complete API docs
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Built with:

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [ioredis](https://github.com/luin/ioredis) - Redis client
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Google Cloud](https://cloud.google.com/) - Cloud infrastructure

---

**Questions or Issues?** Check the documentation or open an issue on GitHub.
