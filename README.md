# Distributed Message Queue Service

A **production-ready distributed message queue service** built with Node.js, TypeScript, React, and Redis. This project implements a scalable, cloud-native message queue with both a REST API and a modern web interface.

## 🎯 Project Overview

This is a complete implementation of a distributed message queue system that allows multiple backend instances to operate as a single logical queue. Messages are shared across all instances with guaranteed FIFO ordering, no duplicates, and no message loss.

### Key Features

- ✅ **Distributed Architecture**: Multiple backend instances share state via Redis
- ✅ **REST API**: Simple enqueue/dequeue operations with timeout support
- ✅ **Dynamic Queues**: Queues created automatically on first use
- ✅ **React Dashboard**: Modern web interface for queue management
- ✅ **Cloud Deployment**: Deployed on Google Cloud Run with auto-scaling
- ✅ **Production-Ready**: Docker containers, health checks, and monitoring

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│            (Queue Dashboard & Management)                │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────────────────┐
│              NestJS Backend (Multiple Instances)         │
│         POST /api/{queue}  │  GET /api/{queue}          │
└────────────────────┬────────────────────────────────────┘
                     │ Redis Protocol
              ┌──────▼──────┐
              │    Redis    │
              │   (Shared)  │
              │ LPUSH/BRPOP │
              └─────────────┘
```

### Technology Stack

**Backend:**

- Node.js 18+ with TypeScript
- NestJS framework
- Redis for queue storage (LIST operations)
- Docker containerization

**Frontend:**

- React 18 with TypeScript
- Vite build tool
- Modern UI with real-time updates
- Nginx for production serving

**Infrastructure:**

- Google Cloud Run (serverless containers)
- Redis (self-hosted or Cloud Memorystore)
- Docker for containerization

## 📋 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Docker (for Redis and containerization)
- Google Cloud SDK (for deployment)

### Local Development

**1. Start Redis:**

```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

**2. Start Backend:**

See backend README.md

**3. Start Frontend:**

See frontend README.md
