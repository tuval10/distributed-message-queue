# Internal Controller API Specification

## Overview

This document defines the complete REST API for the distributed message queue service, including routes needed for the React frontend to create queues, send messages, and view/consume messages.

---

## Core Queue Operations

### 1. Enqueue Message

**Endpoint**: `POST /internal/queues/{queue_name}/messages`

**Description**: Add a message to the specified queue. Queue is created automatically if it doesn't exist.

**Request**:

```typescript
POST /internal/queues/myqueue/messages
Content-Type: application/json

{
  "message": "Hello, World!",
  "priority": "normal",  // optional
  "metadata": {          // optional
    "source": "web-ui",
    "userId": "123"
  }
}
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

**Implementation**:

```typescript
await redis.lpush(
  `queue:${queueName}`,
  JSON.stringify({
    id: generateId(),
    payload: req.body,
    enqueuedAt: new Date().toISOString(),
  }),
);
```

---

### 2. Dequeue Message (Consume)

**Endpoint**: `GET /internal/queues/{queue_name}/messages?timeout={ms}`

**Description**: Retrieve and remove the next message from the queue. Blocks until message available or timeout.

**Query Parameters**:

- `timeout` (optional): Milliseconds to wait for message (default: 10000, max: 60000)

**Request**:

```
GET /internal/queues/myqueue/messages?timeout=5000
```

**Response** (200 OK):

```json
{
  "id": "msg_abc123",
  "payload": {
    "message": "Hello, World!",
    "metadata": {
      "source": "web-ui",
      "userId": "123"
    }
  },
  "enqueuedAt": "2025-10-23T10:30:00.000Z",
  "dequeuedAt": "2025-10-23T10:30:05.000Z"
}
```

**Response** (204 No Content): No message available after timeout

**Implementation**:

```typescript
const timeoutSeconds = Math.floor(timeout / 1000);
const result = await redis.brpop(`queue:${queueName}`, timeoutSeconds);

if (result) {
  const [key, messageStr] = result;
  const message = JSON.parse(messageStr);
  return { ...message, dequeuedAt: new Date().toISOString() };
}
```

---

### 3. Peek at Messages (View without Consuming)

**Endpoint**: `GET /internal/queues/{queue_name}/messages/peek?count={n}`

**Description**: View messages in the queue without removing them. Used by frontend to display queue contents.

**Query Parameters**:

- `count` (optional): Number of messages to peek at (default: 10, max: 100)

**Request**:

```
GET /internal/queues/myqueue/messages/peek?count=5
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

**Implementation**:

```typescript
// Get messages from the right (oldest first) without removing
const messages = await redis.lrange(`queue:${queueName}`, -count, -1);
const depth = await redis.llen(`queue:${queueName}`);

return {
  queue: queueName,
  messages: messages.reverse().map((msg) => JSON.parse(msg)),
  count: messages.length,
  totalDepth: depth,
};
```

---

## Queue Management

### 4. List All Queues

**Endpoint**: `GET /internal/queues`

**Description**: Get a list of all active queues with metadata.

**Request**:

```
GET /internal/queues
```

**Response** (200 OK):

```json
{
  "queues": [
    {
      "name": "orders",
      "depth": 42,
      "oldestMessageAge": 120000,
      "createdAt": "2025-10-23T10:00:00.000Z"
    },
    {
      "name": "notifications",
      "depth": 5,
      "oldestMessageAge": 5000,
      "createdAt": "2025-10-23T10:25:00.000Z"
    }
  ],
  "total": 2
}
```

**Implementation**:

```typescript
// Scan for all queue keys
const keys = await redis.keys('queue:*');
const queues = await Promise.all(
  keys.map(async (key) => {
    const queueName = key.replace('queue:', '');
    const depth = await redis.llen(key);

    // Get oldest message for age calculation
    const oldest = await redis.lindex(key, -1);
    let oldestMessageAge = null;
    if (oldest) {
      const msg = JSON.parse(oldest);
      oldestMessageAge = Date.now() - new Date(msg.enqueuedAt).getTime();
    }

    return {
      name: queueName,
      depth,
      oldestMessageAge,
    };
  }),
);

return { queues: queues.filter((q) => q.depth > 0), total: queues.length };
```

---

### 5. Get Queue Information

**Endpoint**: `GET /internal/queues/{queue_name}`

**Description**: Get detailed information about a specific queue.

**Request**:

```
GET /internal/queues/myqueue
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
  },
  "createdAt": "2025-10-23T10:00:00.000Z",
  "lastActivity": "2025-10-23T10:30:00.000Z"
}
```

**Response** (404 Not Found): Queue doesn't exist

**Implementation**:

```typescript
const depth = await redis.llen(`queue:${queueName}`);

if (depth === 0 && !(await redis.exists(`queue:${queueName}`))) {
  return res.status(404).json({ error: 'Queue not found' });
}

// Get oldest and newest message timestamps
const oldest = await redis.lindex(`queue:${queueName}`, -1);
const newest = await redis.lindex(`queue:${queueName}`, 0);

let oldestMessageAge = null;
let newestMessageAge = null;

if (oldest) {
  const oldestMsg = JSON.parse(oldest);
  oldestMessageAge = Date.now() - new Date(oldestMsg.enqueuedAt).getTime();
}

if (newest) {
  const newestMsg = JSON.parse(newest);
  newestMessageAge = Date.now() - new Date(newestMsg.enqueuedAt).getTime();
}

// Get stats from Redis (tracked separately)
const totalEnqueued =
  (await redis.get(`queue:${queueName}:stats:enqueued`)) || 0;
const totalDequeued =
  (await redis.get(`queue:${queueName}:stats:dequeued`)) || 0;

return {
  name: queueName,
  depth,
  stats: {
    totalEnqueued: parseInt(totalEnqueued),
    totalDequeued: parseInt(totalDequeued),
    oldestMessageAge,
    newestMessageAge,
  },
};
```

---

### 6. Delete Queue

**Endpoint**: `DELETE /internal/queues/{queue_name}`

**Description**: Delete a queue and all its messages. Use with caution!

**Request**:

```
DELETE /internal/queues/myqueue
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

**Response** (404 Not Found): Queue doesn't exist

**Implementation**:

```typescript
const depth = await redis.llen(`queue:${queueName}`);

if (depth === 0 && !(await redis.exists(`queue:${queueName}`))) {
  return res.status(404).json({ error: 'Queue not found' });
}

// Delete queue and stats
await redis.del(`queue:${queueName}`);
await redis.del(`queue:${queueName}:stats:enqueued`);
await redis.del(`queue:${queueName}:stats:dequeued`);

return {
  success: true,
  queue: queueName,
  deletedMessages: depth,
  timestamp: new Date().toISOString(),
};
```

---

### 7. Purge Queue

**Endpoint**: `DELETE /internal/queues/{queue_name}/messages`

**Description**: Remove all messages from a queue without deleting the queue itself.

**Request**:

```
DELETE /internal/queues/myqueue/messages
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

**Implementation**:

```typescript
const depth = await redis.llen(`queue:${queueName}`);
await redis.del(`queue:${queueName}`);

return {
  success: true,
  queue: queueName,
  purgedMessages: depth,
  timestamp: new Date().toISOString(),
};
```

---

## Health & Monitoring

### 8. Health Check

**Endpoint**: `GET /health`

**Description**: Check service health (used by Cloud Run, frontend)

**Request**:

```
GET /health
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
  "error": "Connection refused"
}
```

**Implementation**:

```typescript
const redisStatus = redis.status === 'ready' ? 'connected' : 'disconnected';
const isHealthy = redisStatus === 'connected';

if (isHealthy) {
  res.status(200).json({
    status: 'healthy',
    redis: redisStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
} else {
  res.status(503).json({
    status: 'unhealthy',
    redis: redisStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
```

---

### 9. Get System Stats

**Endpoint**: `GET /api/stats`

**Description**: Get overall system statistics across all queues.

**Request**:

```
GET /api/stats
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
    "totalDepth": 142,
    "totalEnqueued": 5420,
    "totalDequeued": 5278
  },
  "redis": {
    "memoryUsed": "2.5 MB",
    "connectedClients": 3,
    "uptime": 86400
  },
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

**Implementation**:

```typescript
// Get all queue keys
const keys = await redis.keys('queue:*');
const queueKeys = keys.filter((k) => !k.includes(':stats:'));

// Calculate total depth
let totalDepth = 0;
for (const key of queueKeys) {
  totalDepth += await redis.llen(key);
}

// Get Redis info
const info = await redis.info('memory');
const memoryUsed = parseRedisInfo(info, 'used_memory_human');

return {
  queues: {
    total: queueKeys.length,
    active: queueKeys.filter(async (k) => (await redis.llen(k)) > 0).length,
    empty: queueKeys.filter(async (k) => (await redis.llen(k)) === 0).length,
  },
  messages: {
    totalDepth,
  },
  redis: {
    memoryUsed,
  },
  timestamp: new Date().toISOString(),
};
```

---

## Batch Operations

### 10. Bulk Enqueue

**Endpoint**: `POST /internal/queues/{queue_name}/messages/bulk`

**Description**: Add multiple messages to a queue at once.

**Request**:

```json
POST /internal/queues/myqueue/messages/bulk
Content-Type: application/json

{
  "messages": [
    { "message": "First message", "priority": "high" },
    { "message": "Second message" },
    { "message": "Third message" }
  ]
}
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

**Implementation**:

```typescript
const messages = req.body.messages.map((msg) => {
  return JSON.stringify({
    id: generateId(),
    payload: msg,
    enqueuedAt: new Date().toISOString(),
  });
});

// Use pipeline for atomic bulk insert
const pipeline = redis.pipeline();
messages.forEach((msg) => {
  pipeline.lpush(`queue:${queueName}`, msg);
});
await pipeline.exec();

return {
  success: true,
  queue: queueName,
  enqueuedCount: messages.length,
  timestamp: new Date().toISOString(),
};
```

---

## WebSocket Support (Optional for Real-time Updates)

### 11. Subscribe to Queue Updates

**Endpoint**: `WS /internal/queues/{queue_name}/subscribe`

**Description**: WebSocket connection for real-time queue updates (for live UI updates).

**Client**:

```javascript
const ws = new WebSocket(
  'ws://localhost:8080/internal/queues/myqueue/subscribe',
);

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Queue update:', update);
};
```

**Server Events**:

```json
{
  "event": "message_enqueued",
  "queue": "myqueue",
  "depth": 43,
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

```json
{
  "event": "message_dequeued",
  "queue": "myqueue",
  "depth": 42,
  "timestamp": "2025-10-23T10:30:01.000Z"
}
```

**Implementation**:

```typescript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ noServer: true });

// On HTTP upgrade
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  if (
    pathname.startsWith('/internal/queues/') &&
    pathname.endsWith('/subscribe')
  ) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// Publish updates using Redis pub/sub
await redis.publish(
  `queue:${queueName}:events`,
  JSON.stringify({
    event: 'message_enqueued',
    depth: newDepth,
    timestamp: new Date().toISOString(),
  }),
);
```

---

## URL Structure Summary

### Queue Operations

```
POST   /internal/queues/{queue_name}/messages          - Enqueue message
GET    /internal/queues/{queue_name}/messages          - Dequeue message
GET    /internal/queues/{queue_name}/messages/peek     - Peek at messages
DELETE /internal/queues/{queue_name}/messages          - Purge queue
POST   /internal/queues/{queue_name}/messages/bulk     - Bulk enqueue
```

### Queue Management

```
GET    /internal/queues                                 - List all queues
GET    /internal/queues/{queue_name}                    - Get queue info
DELETE /internal/queues/{queue_name}                    - Delete queue
```

### System

```
GET    /health                                     - Health check
GET    /api/stats                                  - System statistics
WS     /internal/queues/{queue_name}/subscribe          - Real-time updates (optional)
```

---

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "queue_name",
    "reason": "Invalid characters"
  }
}
```

### HTTP Status Codes

| Code | Meaning               | Usage                                |
| ---- | --------------------- | ------------------------------------ |
| 200  | OK                    | Successful GET, DELETE, or operation |
| 201  | Created               | Message enqueued successfully        |
| 204  | No Content            | No message available (timeout)       |
| 400  | Bad Request           | Invalid input, malformed JSON        |
| 404  | Not Found             | Queue doesn't exist                  |
| 500  | Internal Server Error | Redis error, unexpected failure      |
| 503  | Service Unavailable   | Redis disconnected, unhealthy        |

---

## CORS Configuration

For frontend access from different origin:

```typescript
import cors from 'cors';

app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  }),
);
```

---

## Rate Limiting (Production)

Implement rate limiting to prevent abuse:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});

app.use('/api/', limiter);
```

---

## Frontend Integration Examples

### React Hook for Queue Operations

```typescript
// useQueue.ts
import { useState, useEffect } from 'react';

export function useQueue(queueName: string) {
  const [depth, setDepth] = useState(0);
  const [messages, setMessages] = useState([]);

  const enqueue = async (message: any) => {
    const res = await fetch(`/internal/queues/${queueName}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return res.json();
  };

  const dequeue = async (timeout = 10000) => {
    const res = await fetch(
      `/internal/queues/${queueName}/messages?timeout=${timeout}`,
    );
    if (res.status === 204) return null;
    return res.json();
  };

  const peek = async (count = 10) => {
    const res = await fetch(
      `/internal/queues/${queueName}/messages/peek?count=${count}`,
    );
    const data = await res.json();
    setMessages(data.messages);
    setDepth(data.totalDepth);
    return data;
  };

  return { depth, messages, enqueue, dequeue, peek };
}
```

### List Queues Component

```typescript
// QueueList.tsx
import { useState, useEffect } from 'react';

export function QueueList() {
  const [queues, setQueues] = useState([]);

  useEffect(() => {
    fetch('/internal/queues')
      .then((res) => res.json())
      .then((data) => setQueues(data.queues));
  }, []);

  return (
    <div>
      <h2>Queues</h2>
      <ul>
        {queues.map((q) => (
          <li key={q.name}>
            {q.name} - {q.depth} messages
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Monitoring Endpoints for Operations

### 12. Get Queue Metrics

**Endpoint**: `GET /internal/queues/{queue_name}/metrics`

**Description**: Get detailed metrics for monitoring and alerting.

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

---

## Implementation Notes

### Track Statistics

Update stats on every enqueue/dequeue:

```typescript
// On enqueue
await redis.incr(`queue:${queueName}:stats:enqueued`);

// On dequeue
await redis.incr(`queue:${queueName}:stats:dequeued`);
```

### Queue Name Validation

```typescript
function validateQueueName(name: string): boolean {
  // Only allow alphanumeric, hyphens, underscores
  return /^[a-zA-Z0-9_-]+$/.test(name) && name.length <= 64;
}
```

### Message ID Generation

```typescript
import { randomBytes } from 'crypto';

function generateMessageId(): string {
  return `msg_${randomBytes(8).toString('hex')}`;
}
```

---

## Testing Checklist

- [ ] Enqueue message to new queue (creates automatically)
- [ ] Dequeue message with timeout (empty queue returns 204)
- [ ] Peek at messages without consuming
- [ ] List all queues with depths
- [ ] Get queue information
- [ ] Delete queue with messages
- [ ] Purge queue messages
- [ ] Bulk enqueue multiple messages
- [ ] Concurrent dequeue (no duplicates)
- [ ] Health check returns correct status
- [ ] CORS headers allow frontend access
- [ ] Error responses follow standard format
- [ ] Rate limiting prevents abuse

This API specification provides everything the React frontend needs to create, manage, and monitor queues effectively!
