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

Want to get started in 5 minutes? See **[QUICK_START.md](QUICK_START.md)** for a step-by-step guide.

**TL;DR:**

```bash
# 1. Start Redis
docker run -d -p 6379:6379 --name redis redis:7-alpine

# 2. Install and run
pnpm install
pnpm run start:dev

# 3. Test
curl http://localhost:3000/health
```

## 📚 Documentation

### Getting Started

- **[Quick Start Guide](QUICK_START.md)** - Get running in 5 minutes
- **[Deployment Guide](DEPLOYMENT.md)** - Docker, Cloud Run, and production deployment

### API Reference

- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference
- **[Internal Controller Spec](internal_controller.md)** - Detailed API specification

### Configuration & Design

- **[Environment Setup](ENV_SETUP.md)** - Configuration guide
- **[PRD](PRD.md)** - Product requirements and architecture
- **[Technologies](Technologies.md)** - Technology stack details
- **[Tradeoffs](Tradeoffs.md)** - Technology selection analysis and design tradeoffs

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

## 🚀 Deployment

Ready to deploy? See **[DEPLOYMENT.md](DEPLOYMENT.md)** for comprehensive deployment guides:

- **Local Development** - Development setup and testing
- **Docker Deployment** - Containerized deployment with Docker Compose
- **Google Cloud Run** - Production deployment on GCP with auto-scaling
- **Terraform** - Infrastructure as Code templates
- **CI/CD** - GitHub Actions pipeline examples
- **Monitoring** - Alerting and observability setup

**Quick Docker:**

```bash
docker build -t message-queue-api .
docker run -p 3000:8080 -e REDIS_HOST=redis message-queue-api
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

```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request
```
