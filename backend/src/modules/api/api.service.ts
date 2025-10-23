import { Injectable, BadRequestException } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { validateQueueName } from '../../utils/helpers';

@Injectable()
export class ApiService {
  constructor(private readonly redisService: RedisService) {}

  async enqueue(queueName: string, message: any) {
    // Validate queue name
    if (!validateQueueName(queueName)) {
      throw new BadRequestException('Invalid queue name');
    }

    const redis = this.redisService.getClient();

    // Add message to queue
    await redis.lpush(`queue:${queueName}`, JSON.stringify(message));

    // Track stats
    await redis.incr(`queue:${queueName}:stats:enqueued`);

    return {
      success: true,
      queue: queueName,
      timestamp: new Date().toISOString(),
    };
  }

  async dequeue(queueName: string, timeoutMs: number) {
    // Validate queue name
    if (!validateQueueName(queueName)) {
      throw new BadRequestException('Invalid queue name');
    }

    // Validate timeout
    if (timeoutMs > 60000) {
      throw new BadRequestException('Timeout exceeds maximum (60s)');
    }

    // Use blocking client for BRPOP operation
    const blockingRedis = this.redisService.getBlockingClient();
    // Use regular client for stats
    const redis = this.redisService.getClient();

    // Block for message (timeout in seconds)
    const timeoutSeconds = Math.floor(timeoutMs / 1000);
    const result = await blockingRedis.brpop(
      `queue:${queueName}`,
      timeoutSeconds,
    );

    if (result) {
      const [key, messageStr] = result;
      const message = JSON.parse(messageStr);

      // Track stats
      await redis.incr(`queue:${queueName}:stats:dequeued`);

      return message;
    }

    return null;
  }
}
