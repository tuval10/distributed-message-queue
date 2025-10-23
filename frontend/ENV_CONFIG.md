# Environment Variables Configuration

This frontend uses Vite's built-in environment variable support. All environment variables must be prefixed with `VITE_` to be exposed to the client-side code.

## Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your configuration

## Available Environment Variables

### `VITE_API_BASE_URL`

- **Type:** `string`
- **Default:** `http://localhost:8080`
- **Description:** The base URL of the backend API server
- **Examples:**
  - Development: `http://localhost:8080`
  - Production: `https://api.yourdomain.com`

### `VITE_MOCK_DATA`

- **Type:** `boolean` (as string)
- **Default:** `false`
- **Description:** Enable mock data mode to run the frontend without a backend
- **Values:**
  - `true`: Use mock data (no backend required)
  - `false`: Connect to real backend API

## Environment Files

Vite loads environment variables from the following files in your project root:

- `.env` - Loaded in all cases (gitignored)
- `.env.local` - Loaded in all cases, ignored by git
- `.env.[mode]` - Only loaded in specified mode (e.g., `.env.production`)
- `.env.[mode].local` - Only loaded in specified mode, ignored by git

Priority (highest to lowest):

1. `.env.[mode].local`
2. `.env.[mode]`
3. `.env.local`
4. `.env`

## Usage in Code

Access environment variables using `import.meta.env`:

```typescript
// In src/config/env.ts
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
  useMockData: import.meta.env.VITE_MOCK_DATA === "true",
};
```

## TypeScript IntelliSense

To get TypeScript autocomplete for environment variables, you can extend the `ImportMetaEnv` interface in `src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_MOCK_DATA: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## Security Notes

⚠️ **Important:**

- Never commit `.env` files to version control (already in `.gitignore`)
- Only commit `.env.example` with dummy/example values
- All `VITE_` prefixed variables are exposed to the client-side code and can be seen by users
- Never store secrets or API keys in environment variables that are prefixed with `VITE_`

## Different Environments

### Development

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_MOCK_DATA=false
```

### Production

```env
VITE_API_BASE_URL=https://api.production.com
VITE_MOCK_DATA=false
```

### Mock/Demo Mode

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_MOCK_DATA=true
```

## Troubleshooting

### Environment variables not updating

- Restart the Vite dev server after changing `.env` files
- Vite only loads environment variables at startup

### Variable is `undefined`

- Make sure the variable name starts with `VITE_`
- Check that the variable is defined in your `.env` file
- Restart the dev server

### Changes not reflecting

- Clear browser cache
- Hard reload the page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)
