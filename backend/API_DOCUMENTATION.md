# Distributed Message Queue API Documentation

## Overview

This backend provides two types of APIs for managing distributed message queues:

1. **API Controller** - Simple REST API for basic queue operations (from PRD)
2. **Internal Controller** - Full queue management API with advanced features (from internal_controller.md)

## Base URL

- Local Development: `http://localhost:3000`
- Production: Your Cloud Run URL

---

## API Controller (Simple Interface)

Based on PRD.md - Simple enqueue/dequeue operations.

### 1. Enqueue Message

**Endpoint**: `POST /api/{queue_name}`

**Description**: Add a message to the queue.

**Example**:

```bash
curl -X POST http://localhost:3000/api/myqueue \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, World!", "userId": 123}'
```

**Response** (201 Created):

```json
{
  "success": true,
  "queue": "myqueue",
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

### 2. Dequeue Message

**Endpoint**: `GET /api/{queue_name}?timeout={ms}`

**Description**: Retrieve and remove the next message from the queue.

**Query Parameters**:

- `timeout` (optional): Milliseconds to wait (default: 10000, max: 60000)

**Example**:

```bash
curl http://localhost:3000/api/myqueue?timeout=5000
```

**Response** (200 OK):

```json
{
  "text": "Hello, World!",
  "userId": 123
}
```

**Response** (204 No Content): No message available

---

## Internal Controller (Full Management)

Based on internal_controller.md - Complete queue management with metadata tracking.

### Queue Message Operations

#### 1. Enqueue Message (Enhanced)

**Endpoint**: `POST /internal/queues/{queue_name}/messages`

**Request Body**:

```json
{
  "message": "Hello, World!",
  "priority": "normal",
  "metadata": {
    "source": "web-ui",
    "userId": "123"
  }
}
```

**Example**:

```bash
curl -X POST http://localhost:3000/internal/queues/myqueue/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, World!",
    "priority": "normal",
    "metadata": {"source": "api"}
  }'
```

**Response** (201 Created):

```json
{
  "success": true,
  "queue": "myqueue",
  "messageId": "msg_abc123",
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

#### 2. Dequeue Message (Enhanced)

**Endpoint**: `GET /internal/queues/{queue_name}/messages?timeout={ms}`

**Example**:

```bash
curl http://localhost:3000/internal/queues/myqueue/messages?timeout=5000
```

**Response** (200 OK):

```json
{
  "id": "msg_abc123",
  "payload": {
    "message": "Hello, World!",
    "priority": "normal",
    "metadata": {
      "source": "api"
    }
  },
  "enqueuedAt": "2025-10-23T10:30:00.000Z",
  "dequeuedAt": "2025-10-23T10:30:05.000Z"
}
```

#### 3. Peek at Messages

**Endpoint**: `GET /internal/queues/{queue_name}/messages/peek?count={n}`

**Description**: View messages without removing them.

**Query Parameters**:

- `count` (optional): Number of messages to view (default: 10, max: 100)

**Example**:

```bash
curl http://localhost:3000/internal/queues/myqueue/messages/peek?count=5
```

**Response** (200 OK):

```json
{
  "queue": "myqueue",
  "messages": [
    {
      "id": "msg_abc123",
      "payload": { "message": "First message" },
      "enqueuedAt": "2025-10-23T10:30:00.000Z"
    },
    {
      "id": "msg_abc124",
      "payload": { "message": "Second message" },
      "enqueuedAt": "2025-10-23T10:30:01.000Z"
    }
  ],
  "count": 2,
  "totalDepth": 25
}
```

#### 4. Bulk Enqueue

**Endpoint**: `POST /internal/queues/{queue_name}/messages/bulk`

**Request Body**:

```json
{
  "messages": [
    { "message": "First message", "priority": "high" },
    { "message": "Second message" },
    { "message": "Third message" }
  ]
}
```

**Example**:

```bash
curl -X POST http://localhost:3000/internal/queues/myqueue/messages/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"message": "Message 1"},
      {"message": "Message 2"},
      {"message": "Message 3"}
    ]
  }'
```

**Response** (201 Created):

```json
{
  "success": true,
  "queue": "myqueue",
  "enqueuedCount": 3,
  "messageIds": ["msg_abc123", "msg_abc124", "msg_abc125"],
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

#### 5. Purge Queue Messages

**Endpoint**: `DELETE /internal/queues/{queue_name}/messages`

**Description**: Remove all messages from a queue.

**Example**:

```bash
curl -X DELETE http://localhost:3000/internal/queues/myqueue/messages
```

**Response** (200 OK):

```json
{
  "success": true,
  "queue": "myqueue",
  "purgedMessages": 42,
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

### Queue Management

#### 6. List All Queues

**Endpoint**: `GET /internal/queues`

**Example**:

```bash
curl http://localhost:3000/internal/queues
```

**Response** (200 OK):

```json
{
  "queues": [
    {
      "name": "orders",
      "depth": 42,
      "oldestMessageAge": 120000
    },
    {
      "name": "notifications",
      "depth": 5,
      "oldestMessageAge": 5000
    }
  ],
  "total": 2
}
```

#### 7. Get Queue Information

**Endpoint**: `GET /internal/queues/{queue_name}`

**Example**:

```bash
curl http://localhost:3000/internal/queues/myqueue
```

**Response** (200 OK):

```json
{
  "name": "myqueue",
  "depth": 42,
  "stats": {
    "totalEnqueued": 1205,
    "totalDequeued": 1163,
    "oldestMessageAge": 120000,
    "newestMessageAge": 100
  }
}
```

#### 8. Delete Queue

**Endpoint**: `DELETE /internal/queues/{queue_name}`

**Description**: Delete a queue and all its messages.

**Example**:

```bash
curl -X DELETE http://localhost:3000/internal/queues/myqueue
```

**Response** (200 OK):

```json
{
  "success": true,
  "queue": "myqueue",
  "deletedMessages": 42,
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

#### 9. Get Queue Metrics

**Endpoint**: `GET /internal/queues/{queue_name}/metrics`

**Example**:

```bash
curl http://localhost:3000/internal/queues/myqueue/metrics
```

**Response** (200 OK):

```json
{
  "queue": "myqueue",
  "metrics": {
    "depth": 42,
    "enqueueRate": {
      "perSecond": 5.2,
      "perMinute": 312,
      "perHour": 18720
    },
    "dequeueRate": {
      "perSecond": 4.8,
      "perMinute": 288,
      "perHour": 17280
    },
    "averageWaitTime": 2500,
    "oldestMessageAge": 120000
  },
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

### System Endpoints

#### 10. Get System Statistics

**Endpoint**: `GET /api/stats`

**Example**:

```bash
curl http://localhost:3000/api/stats
```

**Response** (200 OK):

```json
{
  "queues": {
    "total": 5,
    "active": 3,
    "empty": 2
  },
  "messages": {
    "totalDepth": 142
  },
  "redis": {
    "memoryUsed": "2.5M"
  },
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

#### 11. Health Check

**Endpoint**: `GET /health`

**Example**:

```bash
curl http://localhost:3000/health
```

**Response** (200 OK):

```json
{
  "status": "healthy",
  "redis": "connected",
  "uptime": 3600,
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

**Response** (503 Service Unavailable):

```json
{
  "status": "unhealthy",
  "redis": "disconnected",
  "uptime": 3600,
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Invalid queue name",
  "error": "Bad Request"
}
```

### HTTP Status Codes

| Code | Meaning               | Usage                           |
| ---- | --------------------- | ------------------------------- |
| 200  | OK                    | Successful operation            |
| 201  | Created               | Message enqueued successfully   |
| 204  | No Content            | No message available (timeout)  |
| 400  | Bad Request           | Invalid input, malformed JSON   |
| 404  | Not Found             | Queue doesn't exist             |
| 500  | Internal Server Error | Redis error, unexpected failure |
| 503  | Service Unavailable   | Redis disconnected, unhealthy   |

---

## Queue Name Validation

Queue names must:

- Contain only alphanumeric characters, hyphens, and underscores
- Be between 1 and 64 characters long
- Match regex: `^[a-zA-Z0-9_-]+$`

**Valid**: `my-queue`, `orders_queue`, `queue123`  
**Invalid**: `my queue`, `queue@123`, `queue.name`

---

## Testing

### Quick Test Script

```bash
#!/bin/bash

# Enqueue a message
curl -X POST http://localhost:3000/api/myqueue \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message", "id": 1}'

# Dequeue the message
curl http://localhost:3000/api/myqueue?timeout=5000

# List all queues
curl http://localhost:3000/internal/queues

# Check health
curl http://localhost:3000/health
```

---

## Development

### Starting the Server

```bash
# Development mode (with hot reload)
pnpm run start:dev

# Production mode
pnpm run start:prod
```

### Environment Variables

See `.env.example` for all available configuration options:

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

---

## Architecture

### Controllers

1. **ApiController** (`/api/{queue_name}`)

   - Simple POST/GET interface
   - Direct Redis operations
   - Minimal overhead

2. **InternalController** (`/internal/queues/...`)

   - Full queue management
   - Message metadata tracking
   - Statistics and metrics
   - Bulk operations

3. **HealthController** (`/health`)
   - Service health checks
   - Redis connection status

### Redis Data Structure

```
queue:{queue_name}                     - List of messages (FIFO)
queue:{queue_name}:stats:enqueued      - Total messages enqueued
queue:{queue_name}:stats:dequeued      - Total messages dequeued
```

### Message Format

```typescript
{
  "id": "msg_abc123",              // Unique message ID
  "payload": { ... },               // User's message data
  "enqueuedAt": "2025-10-23T...",  // Timestamp
  "dequeuedAt": "2025-10-23T..."   // Set when dequeued
}
```

---

## Production Deployment

### Docker Build

```bash
docker build -t message-queue-api .
docker run -p 3000:3000 \
  -e REDIS_HOST=your-redis-host \
  -e REDIS_PORT=6379 \
  message-queue-api
```

### Cloud Run Deployment

```bash
gcloud run deploy message-queue-api \
  --image=gcr.io/PROJECT_ID/message-queue-api:latest \
  --region=us-central1 \
  --vpc-connector=redis-vpc-connector \
  --set-env-vars="REDIS_HOST=10.0.0.3,REDIS_PORT=6379" \
  --min-instances=0 \
  --max-instances=100
```

---

## Support

For issues or questions:

1. Check the PRD.md for architecture details
2. Check the internal_controller.md for API specifications
3. Review the ENV_SETUP.md for configuration help
