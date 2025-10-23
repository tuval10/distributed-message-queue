# Distributed Message Queue - Frontend

A React web interface for the distributed message queue service.

## Features

- **Queue Dashboard**: View all queues and create new ones
- **Queue Details**: Send messages, consume messages, and view queue status
- **Mock Mode**: Test the UI without a backend using mock data
- **Material UI**: Clean, modern interface

## Tech Stack

- React 18
- TypeScript
- Material UI
- React Router
- Vite
- Axios

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_MOCK_DATA=false
```

- `VITE_API_BASE_URL`: Base URL of the backend API
- `VITE_MOCK_DATA`: Set to `true` to use mock data instead of real API

## Local Development

### Prerequisites

- Node.js 18+ (or use the version in `.nvmrc` if present)
- pnpm 10+ (specified in package.json)

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will be available at `http://localhost:3000`

### Mock Mode

To test the UI without a backend:

1. Set `VITE_MOCK_DATA=true` in `.env`
2. Run `pnpm dev`

Mock mode includes sample queues and messages for testing.

### Production Build

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Screens

### 1. Queue Dashboard (`/`)

Shows list of all queues with a form/button to create new queues.

### 2. Queue Details (`/queue/:queueName`)

Displays messages in the selected queue, with controls to send new messages and consume/delete messages.

## API Integration

The app communicates with the backend using these endpoints:

- `POST /api/{queue_name}` - Enqueue a message
- `GET /api/{queue_name}?timeout={ms}` - Dequeue a message (FIFO)

Note: The backend doesn't expose a "list queues" endpoint, so queues are tracked in localStorage.

## Deployment

### Deploy to Render/Railway/Fly.io

1. Set environment variables:

   - `VITE_API_BASE_URL`: Your backend API URL
   - `VITE_MOCK_DATA`: `false`

2. Build command: `pnpm install && pnpm build`

3. Start command: `pnpm preview` (or use a static file server)

4. Output directory: `dist`

### Deploy to Google Cloud Run

The frontend container is configured to listen on port 8080 (Cloud Run's default PORT).

```bash
# Export environment variables
export PROJECT_ID="YOUR_PROJECT_ID"
export VITE_API_BASE_URL="https://your-backend-url.run.app"

# Build Docker image for linux/amd64 (required by Cloud Run)
# Pass API URL as build argument
docker buildx build --platform=linux/amd64 \
  --build-arg VITE_API_BASE_URL=$VITE_API_BASE_URL \
  -t gcr.io/$PROJECT_ID/message-queue-frontend \
  --push .

# Deploy to Cloud Run
gcloud run deploy message-queue-frontend \
  --image=gcr.io/$PROJECT_ID/message-queue-frontend \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=8080
```

**Note:** The API URL is baked into the frontend build, so you need to rebuild and redeploy if it changes.
