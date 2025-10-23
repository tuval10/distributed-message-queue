import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private blockingClient: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisConfig = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),

      // Connection pool settings
      enableOfflineQueue: true, // Queue operations while connecting/reconnecting
      lazyConnect: false, // Connect immediately on startup

      // Retry strategy
      retryStrategy: (times) => {
        if (times > 3) {
          // Give up after 3 retries
          return null;
        }
        // Exponential backoff: 50ms, 100ms, 200ms
        return Math.min(times * 50, 2000);
      },

      // Request timeout
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,

      // Keep-alive
      keepAlive: 30000,
    };

    // Regular client for non-blocking operations
    this.client = new Redis(redisConfig);

    // Separate client for blocking operations (BRPOP, BLPOP, etc.)
    this.blockingClient = new Redis(redisConfig);

    // Error handling for regular client
    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    // Error handling for blocking client
    this.blockingClient.on('error', (err) => {
      console.error('Redis blocking connection error:', err);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.blockingClient.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  getBlockingClient(): Redis {
    return this.blockingClient;
  }

  get status(): string {
    return this.client.status;
  }

  isReady(): boolean {
    return this.client.status === 'ready';
  }
}
