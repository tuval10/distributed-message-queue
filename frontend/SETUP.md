# Frontend Setup Instructions

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment file and configure as needed:

```bash
cp .env.example .env
```

The `.env` file contains:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_MOCK_DATA=false
```

**Environment Variables:**

- `VITE_API_BASE_URL`: The backend API URL (default: `http://localhost:8080`)
- `VITE_MOCK_DATA`: Set to `true` to use mock data (no backend required), `false` to use real API

> **Note:** Vite automatically loads `.env` files. All environment variables must be prefixed with `VITE_` to be exposed to the frontend code.

### 3. Start Development Server

```bash
pnpm dev
```

The app will run at `http://localhost:3000`

## Mock Mode vs Real API

### Mock Mode (Recommended for Development)

```env
VITE_MOCK_DATA=true
```

- Works without backend
- Pre-populated with sample queues and messages
- Perfect for UI development and testing

### Real API Mode

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_MOCK_DATA=false
```

- Requires backend to be running
- Real queue operations
- Data persists in Redis

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint

## Testing the Application

### With Mock Data

1. Set `VITE_MOCK_DATA=true`
2. Run `pnpm dev`
3. Visit `http://localhost:3000`
4. You'll see 3 pre-created queues with sample messages

### With Real Backend

1. Start the backend server (see backend README)
2. Set `VITE_API_BASE_URL` to your backend URL
3. Set `VITE_MOCK_DATA=false`
4. Run `pnpm dev`
5. Create queues and send/consume messages

## Deployment

See the main README.md for deployment instructions.
