# Deployment Guide

This guide covers deploying the Distributed Message Queue service to various environments.

## Table of Contents

- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Google Cloud Run](#google-cloud-run)
- [Production Checklist](#production-checklist)

---

## Local Development

### Prerequisites

- Node.js 18+
- pnpm
- Redis (Docker or local)

### Setup

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Start Redis**:

   ```bash
   docker run -d -p 6379:6379 --name redis redis:7-alpine
   ```

3. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

4. **Run development server**:

   ```bash
   pnpm run start:dev
   ```

5. **Test**:
   ```bash
   curl http://localhost:3000/health
   ./test-api.sh
   ```

---

## Docker Deployment

### Build Image

```bash
# Build for AMD64 platform (required for Cloud Run)
docker buildx build --platform linux/amd64 -t message-queue-api:latest --load .
```

### Run Locally

```bash
# Start Redis
docker network create queue-network
docker run -d --name redis --network queue-network redis:7-alpine

# Run application
docker run -d \
  --name message-queue-api \
  --network queue-network \
  -p 3000:8080 \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  -e NODE_ENV=production \
  message-queue-api:latest
```

### Test

```bash
curl http://localhost:3000/health
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  api:
    build: .
    ports:
      - '3000:8080'
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - NODE_ENV=production
      - PORT=8080
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  redis-data:
```

Run with:

```bash
docker-compose up -d
```

---

## Google Cloud Run

### Prerequisites

- Google Cloud Project with billing enabled
- gcloud CLI installed and configured
- Docker installed with buildx support (Docker Desktop includes this by default)

> **Note**: Cloud Run requires `linux/amd64` architecture. If you're on Apple Silicon (M1/M2/M3), you must use `docker buildx` to build for the correct platform.

### Step 1: Set Up Redis (Memorystore)

1. **Create VPC Network** (if not exists):

   ```bash
   gcloud compute networks create queue-vpc \
     --subnet-mode=auto
   ```

2. **Create Redis Instance**:

   ```bash
   gcloud redis instances create message-queue \
     --size=1 \
     --region=us-central1 \
     --redis-version=redis_7_0 \
     --network=queue-vpc \
     --tier=basic
   ```

3. **Get Redis IP**:
   ```bash
   gcloud redis instances describe message-queue \
     --region=us-central1 \
     --format="value(host)"
   ```

### Step 2: Create VPC Connector

```bash
gcloud compute networks vpc-access connectors create queue-connector \
  --network=queue-vpc \
  --region=us-central1 \
  --range=10.8.0.0/28
```

### Step 3: Build and Push Image

```bash
# Set project ID
export PROJECT_ID=your-project-id

# Enable Container Registry
gcloud services enable containerregistry.googleapis.com

# Configure Docker auth
gcloud auth configure-docker

# Build for AMD64 platform and push directly to GCR
# (Cloud Run requires linux/amd64 architecture)
docker buildx build --platform linux/amd64 \
  -t gcr.io/$PROJECT_ID/message-queue-api:latest \
  --push .
```

### Step 4: Deploy to Cloud Run

```bash
# Get Redis IP (from Step 1)
export REDIS_IP=$(gcloud redis instances describe message-queue \
  --region=us-central1 --format="value(host)")
export PROJECT_ID=$(gcloud config get-value project)

# Deploy
gcloud run deploy message-queue-api \
  --image=gcr.io/$PROJECT_ID/message-queue-api:latest \
  --region=us-central1 \
  --platform=managed \
  --vpc-connector=queue-connector \
  --vpc-egress=private-ranges-only \
  --set-env-vars="REDIS_HOST=$REDIS_IP,REDIS_PORT=6379,NODE_ENV=production" \
  --min-instances=0 \
  --max-instances=100 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=60s \
  --concurrency=80 \
  --allow-unauthenticated
```

### Step 5: Test Deployment

```bash
# Get service URL
export SERVICE_URL=$(gcloud run services describe message-queue-api \
  --region=us-central1 --format="value(status.url)")

# Test health
curl $SERVICE_URL/health

# Test enqueue
curl -X POST $SERVICE_URL/api/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from Cloud Run!"}'

# Test dequeue
curl "$SERVICE_URL/api/test?timeout=5000"
```

### Cloud Run Configuration Options

#### Auto-scaling

```bash
# Set custom scaling
--min-instances=2 \
--max-instances=50 \
--cpu-throttling \
--max-instances-per-request=1
```

#### Resource Limits

```bash
# Increase resources
--memory=1Gi \
--cpu=2 \
--timeout=300s
```

#### Authentication

```bash
# Require authentication
--no-allow-unauthenticated

# Test with auth
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  $SERVICE_URL/health
```

---

## Production Checklist

### Security

- [ ] Remove `--allow-unauthenticated` from Cloud Run
- [ ] Set up Cloud IAM authentication
- [ ] Configure Redis password/AUTH
- [ ] Use Redis Standard tier (HA)
- [ ] Enable VPC Service Controls
- [ ] Configure firewall rules
- [ ] Set up SSL/TLS for Redis
- [ ] Review CORS origins in `.env`

### Monitoring

- [ ] Set up Cloud Monitoring dashboards
- [ ] Configure alerting policies
- [ ] Enable Cloud Logging
- [ ] Set up uptime checks
- [ ] Monitor Redis metrics
- [ ] Set up error reporting
- [ ] Configure log-based metrics

### Performance

- [ ] Load test with expected traffic
- [ ] Tune Redis configuration
- [ ] Optimize Cloud Run settings
- [ ] Configure CDN if needed
- [ ] Review timeout settings
- [ ] Set appropriate instance limits

### Reliability

- [ ] Use Redis Standard tier (HA)
- [ ] Set up Redis backups
- [ ] Configure health checks
- [ ] Implement retry logic
- [ ] Set up circuit breakers
- [ ] Plan disaster recovery

### Cost Optimization

- [ ] Set appropriate min/max instances
- [ ] Review memory/CPU allocation
- [ ] Monitor Redis memory usage
- [ ] Set up budget alerts
- [ ] Review scaling policies
- [ ] Consider committed use discounts

---

## Terraform Deployment

Create `main.tf`:

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "queue-vpc"
  auto_create_subnetworks = true
}

# Redis Instance
resource "google_redis_instance" "queue" {
  name               = "message-queue"
  tier               = "STANDARD_HA"
  memory_size_gb     = 1
  region             = var.region
  redis_version      = "REDIS_7_0"
  authorized_network = google_compute_network.vpc.id

  lifecycle {
    prevent_destroy = true
  }
}

# VPC Connector
resource "google_vpc_access_connector" "connector" {
  name          = "queue-connector"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.8.0.0/28"
}

# Cloud Run Service
resource "google_cloud_run_service" "api" {
  name     = "message-queue-api"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/message-queue-api:latest"

        env {
          name  = "REDIS_HOST"
          value = google_redis_instance.queue.host
        }

        env {
          name  = "REDIS_PORT"
          value = google_redis_instance.queue.port
        }

        env {
          name  = "NODE_ENV"
          value = "production"
        }

        env {
          name  = "PORT"
          value = "8080"
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
        "run.googleapis.com/vpc-access-egress"    = "private-ranges-only"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# IAM for public access (remove for production)
resource "google_cloud_run_service_iam_member" "public" {
  service  = google_cloud_run_service.api.name
  location = google_cloud_run_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Outputs
output "service_url" {
  value = google_cloud_run_service.api.status[0].url
}

output "redis_host" {
  value = google_redis_instance.queue.host
}
```

Variables file `variables.tf`:

```hcl
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}
```

Deploy:

```bash
terraform init
terraform plan
terraform apply
```

---

## CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: us-central1
  SERVICE_NAME: message-queue-api

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}

      - name: Configure Docker
        run: gcloud auth configure-docker

      - name: Build and push image
        run: |
          docker buildx build --platform linux/amd64 \
            -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA \
            --push .

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy $SERVICE_NAME \
            --image=gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA \
            --region=$REGION \
            --platform=managed \
            --allow-unauthenticated
```

---

## Monitoring & Alerting

### Set up alerts

```bash
# Create alert policy for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="5xx errors > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s
```

### View logs

```bash
# Stream logs
gcloud run services logs tail message-queue-api \
  --region=us-central1 \
  --follow

# View specific logs
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=message-queue-api" \
  --limit=50 \
  --format=json
```

---

## Troubleshooting

### Architecture Error: "must support amd64/linux"

**Error**: `Container manifest type must support amd64/linux`

**Cause**: Image was built for wrong architecture (ARM64 on Apple Silicon)

**Solution**: Rebuild with platform flag:

```bash
docker buildx build --platform linux/amd64 \
  -t gcr.io/$PROJECT_ID/message-queue-api:latest \
  --push .
```

### Cloud Run won't connect to Redis

1. Check VPC connector is configured
2. Verify Redis is in same VPC
3. Check firewall rules
4. Verify Redis IP in environment variables

### High latency

1. Check Redis connection pooling
2. Review Cloud Run instance count
3. Check VPC connector capacity
4. Monitor Redis metrics

### Memory issues

1. Increase Cloud Run memory limit
2. Check for memory leaks
3. Review Redis memory usage
4. Monitor queue depths

---

For more information, see:

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Memorystore Documentation](https://cloud.google.com/memorystore/docs/redis)
- [VPC Access Documentation](https://cloud.google.com/vpc/docs/configure-serverless-vpc-access)
