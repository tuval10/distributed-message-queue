# Quick Start Guide

Get the Distributed Message Queue API running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Redis running locally or accessible remotely

## Step 1: Start Redis

### Option A: Using Docker (Recommended)

```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

### Option B: Using Homebrew (macOS)

```bash
brew install redis
brew services start redis
```

### Option C: Using Package Manager (Linux)

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# CentOS/RHEL
sudo yum install redis
sudo systemctl start redis
```

## Step 2: Install Dependencies

```bash
cd backend
pnpm install
```

## Step 3: Configure Environment

The `.env` file has already been created with defaults:

```bash
# View the configuration
cat .env
```

If Redis is not on localhost:6379, edit `.env`:

```bash
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

## Step 4: Start the Server

### Development Mode (with hot reload)

```bash
pnpm run start:dev
```

You should see:

```
Application is running on: http://localhost:3000
Environment: development
Redis: localhost:6379
Connected to Redis
Redis client ready
```

### Production Mode

```bash
pnpm run build
pnpm run start:prod
```

## Step 5: Test the API

### Quick Test

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "healthy",
  "redis": "connected",
  "uptime": 10.5,
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

### Enqueue a Message

```bash
curl -X POST http://localhost:3000/api/myqueue \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, World!", "userId": 123}'
```

### Dequeue the Message

```bash
curl http://localhost:3000/api/myqueue?timeout=5000
```

## Step 6: Run Full Test Suite

We've included a comprehensive test script:

```bash
./test-api.sh
```

This will test all endpoints and operations.

## Next Steps

1. **Read the API Documentation**: Check `API_DOCUMENTATION.md` for all available endpoints
2. **Explore the PRD**: See `PRD.md` for architecture and design decisions
3. **Configure for Production**: Review `ENV_SETUP.md` for advanced configuration

## Common Issues

### Redis Connection Failed

**Error**: `Redis connection error: connect ECONNREFUSED`

**Solution**: Make sure Redis is running:

```bash
# Check if Redis is running
redis-cli ping
# Should respond with: PONG

# If not running, start it (Docker)
docker start redis

# Or (Homebrew)
brew services start redis
```

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**: Change the port in `.env`:

```bash
PORT=3001
```

### Module Not Found

**Error**: `Cannot find module 'ioredis'`

**Solution**: Reinstall dependencies:

```bash
pnpm install
```

## API Overview

### Simple API (from PRD)

```bash
# Enqueue
POST /api/{queue_name}

# Dequeue
GET /api/{queue_name}?timeout={ms}
```

### Full Management API (from internal_controller)

```bash
# Queue Operations
POST   /internal/queues/{queue_name}/messages       # Enqueue
GET    /internal/queues/{queue_name}/messages       # Dequeue
GET    /internal/queues/{queue_name}/messages/peek  # Peek
POST   /internal/queues/{queue_name}/messages/bulk  # Bulk enqueue
DELETE /internal/queues/{queue_name}/messages       # Purge

# Queue Management
GET    /internal/queues                             # List all queues
GET    /internal/queues/{queue_name}                # Get queue info
DELETE /internal/queues/{queue_name}                # Delete queue
GET    /internal/queues/{queue_name}/metrics        # Queue metrics

# System
GET    /health                                 # Health check
GET    /api/stats                              # System stats
```

## Development Tips

### Watch Logs

```bash
pnpm run start:dev
```

Logs will show:

- All API requests
- Redis operations
- Enqueue/dequeue operations
- Errors and warnings

### Monitor Redis

```bash
# Connect to Redis CLI
redis-cli

# View all queues
KEYS queue:*

# View queue depth
LLEN queue:myqueue

# View messages
LRANGE queue:myqueue 0 -1

# View stats
GET queue:myqueue:stats:enqueued
GET queue:myqueue:stats:dequeued
```

## Production Checklist

Before deploying to production:

- [ ] Update Redis credentials in `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS origins
- [ ] Set up Redis with authentication
- [ ] Use Redis Standard tier (with HA)
- [ ] Set up monitoring and alerting
- [ ] Configure proper resource limits
- [ ] Set up VPC for Redis access
- [ ] Review security settings

## Getting Help

- **API Documentation**: `API_DOCUMENTATION.md`
- **Environment Setup**: `ENV_SETUP.md`
- **Architecture**: `PRD.md`
- **API Specification**: `internal_controller.md`

## Example Use Cases

### Message Queue for Background Jobs

```bash
# Producer: Enqueue a job
curl -X POST http://localhost:3000/internal/queues/jobs/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "type": "send_email",
      "to": "user@example.com",
      "subject": "Welcome!"
    }
  }'

# Worker: Process jobs
while true; do
  curl http://localhost:3000/internal/queues/jobs/messages?timeout=30000 \
    | jq '.'
done
```

### Event Processing

```bash
# Enqueue events
curl -X POST http://localhost:3000/internal/queues/events/messages/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"message": {"event": "user_signup", "userId": 123}},
      {"message": {"event": "user_login", "userId": 123}},
      {"message": {"event": "purchase", "userId": 123, "amount": 99.99}}
    ]
  }'

# Process events
curl http://localhost:3000/internal/queues/events/messages?timeout=10000
```

Happy queuing! 🚀
