# Environment Configuration Guide

## Overview

The backend application now supports environment-based configuration using `.env` files. This allows you to customize application settings without modifying the code.

## Setup

### 1. Initial Setup

A `.env` file has been created with default values. You can modify it to suit your needs:

```bash
# View the current configuration
cat .env

# Edit the configuration
nano .env  # or use your preferred editor
```

### 2. Configuration Files

- **`.env`** - Your local environment configuration (gitignored, not committed)
- **`.env.example`** - Template file with all available options (committed to repo)

## Available Environment Variables

### Application Settings

| Variable   | Description                                    | Default     | Required |
| ---------- | ---------------------------------------------- | ----------- | -------- |
| `PORT`     | Port number for the application                | 3000        | No       |
| `NODE_ENV` | Environment mode (development/production/test) | development | No       |

### Future Configuration (Examples)

The `.env.example` file includes commented examples for:

- **Database**: PostgreSQL connection strings
- **Redis**: Cache server configuration
- **JWT**: Authentication tokens
- **CORS**: Cross-origin resource sharing settings
- **API**: API versioning and prefixes

## Usage in Code

### Using ConfigService

The `ConfigService` is available globally and can be injected into any service:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class YourService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    // Get a configuration value with type safety
    const port = this.configService.get<number>('PORT');

    // Get with a default value
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    // Get required value (throws error if not found)
    const apiKey = this.configService.getOrThrow<string>('API_KEY');
  }
}
```

### Example Implementation

Check `src/app.service.ts` for a working example of how to use `ConfigService`.

## Best Practices

1. **Never commit `.env`** - It's already in `.gitignore`
2. **Keep `.env.example` updated** - Add new variables here for team members
3. **Use type-safe getters** - Always specify the type: `get<number>()`, `get<string>()`
4. **Provide defaults** - Use fallback values for non-critical settings
5. **Use `getOrThrow`** - For required configuration that must be present
6. **Document variables** - Add comments in `.env.example` explaining each variable

## Running the Application

The application will automatically load environment variables from `.env`:

```bash
# Development mode
pnpm run start:dev

# Production mode
pnpm run start:prod
```

## Environment-Specific Configurations

You can create multiple environment files:

- `.env.development`
- `.env.production`
- `.env.test`

Update `app.module.ts` to load specific files based on `NODE_ENV`:

```typescript
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
});
```

## Validation (Optional)

For production applications, consider adding validation using `Joi`:

```bash
pnpm add joi
```

Then update `app.module.ts`:

```typescript
import * as Joi from 'joi';

ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    PORT: Joi.number().default(3000),
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
  }),
});
```

## Troubleshooting

### Variables not loading?

1. Ensure `.env` file is in the backend root directory
2. Restart the application after modifying `.env`
3. Check for syntax errors in `.env` (no spaces around `=`)

### Port already in use?

Change the `PORT` variable in `.env`:

```bash
PORT=3001
```

## Additional Resources

- [NestJS Configuration Documentation](https://docs.nestjs.com/techniques/configuration)
- [dotenv Package](https://github.com/motdotla/dotenv)
