import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import { EnqueueMessageDto, BulkEnqueueDto } from '../../../dto/enqueue.dto';
import {
  validateQueueName,
  generateMessageId,
  parseRedisInfo,
} from '../../../utils/helpers';
import {
  QueueMessage,
  QueueInfo,
  QueueListItem,
  SystemStats,
  QueueMetrics,
} from '../../../types/queue.types';

@Injectable()
export class QueuesService {
  constructor(private readonly redisService: RedisService) {}

  async enqueueMessage(queueName: string, dto: EnqueueMessageDto) {
    if (!validateQueueName(queueName)) {
      throw new BadRequestException('Invalid queue name');
    }

    const redis = this.redisService.getClient();
    const messageId = generateMessageId();

    const message: QueueMessage = {
      id: messageId,
      payload: dto.message,
      enqueuedAt: new Date().toISOString(),
    };

    // Create metadata if this is the first message and metadata doesn't exist
    const metadataExists = await redis.exists(`queue:${queueName}:metadata`);
    if (!metadataExists) {
      const metadata = {
        createdAt: new Date().toISOString(),
        name: queueName,
      };
      await redis.set(`queue:${queueName}:metadata`, JSON.stringify(metadata));
    }

    await redis.lpush(`queue:${queueName}`, JSON.stringify(message));
    await redis.incr(`queue:${queueName}:stats:enqueued`);

    return {
      success: true,
      queue: queueName,
      messageId,
      timestamp: message.enqueuedAt,
    };
  }

  async dequeueMessage(queueName: string, timeoutMs: number) {
    if (!validateQueueName(queueName)) {
      throw new BadRequestException('Invalid queue name');
    }

    if (timeoutMs > 60000) {
      throw new BadRequestException('Timeout exceeds maximum (60s)');
    }

    // Use blocking client for BRPOP operation
    const blockingRedis = this.redisService.getBlockingClient();
    // Use regular client for stats
    const redis = this.redisService.getClient();

    const timeoutSeconds = Math.floor(timeoutMs / 1000);
    const result = await blockingRedis.brpop(
      `queue:${queueName}`,
      timeoutSeconds,
    );

    if (result) {
      const [, messageStr] = result;
      const message: QueueMessage = JSON.parse(messageStr);
      message.dequeuedAt = new Date().toISOString();

      await redis.incr(`queue:${queueName}:stats:dequeued`);

      return message;
    }

    return null;
  }

  async peekMessages(queueName: string, count: number) {
    if (!validateQueueName(queueName)) {
      throw new BadRequestException('Invalid queue name');
    }

    const messageCount = Math.min(count, 100);
    const redis = this.redisService.getClient();

    // Get messages from the right (oldest first) without removing
    const messages = await redis.lrange(
      `queue:${queueName}`,
      -messageCount,
      -1,
    );
    const depth = await redis.llen(`queue:${queueName}`);

    return {
      queue: queueName,
      messages: messages.reverse().map((msg) => JSON.parse(msg)),
      count: messages.length,
      totalDepth: depth,
    };
  }

  async bulkEnqueue(queueName: string, dto: BulkEnqueueDto) {
    if (!validateQueueName(queueName)) {
      throw new BadRequestException('Invalid queue name');
    }

    const redis = this.redisService.getClient();
    const messageIds: string[] = [];

    const messages = dto.messages.map((msg) => {
      const messageId = generateMessageId();
      messageIds.push(messageId);

      return JSON.stringify({
        id: messageId,
        payload: msg,
        enqueuedAt: new Date().toISOString(),
      });
    });

    // Use pipeline for atomic bulk insert
    const pipeline = redis.pipeline();
    messages.forEach((msg) => {
      pipeline.lpush(`queue:${queueName}`, msg);
    });
    pipeline.incrby(`queue:${queueName}:stats:enqueued`, messages.length);
    await pipeline.exec();

    return {
      success: true,
      queue: queueName,
      enqueuedCount: messages.length,
      messageIds,
      timestamp: new Date().toISOString(),
    };
  }

  async purgeQueue(queueName: string) {
    if (!validateQueueName(queueName)) {
      throw new BadRequestException('Invalid queue name');
    }

    const redis = this.redisService.getClient();
    const depth = await redis.llen(`queue:${queueName}`);
    await redis.del(`queue:${queueName}`);

    return {
      success: true,
      queue: queueName,
      purgedMessages: depth,
      timestamp: new Date().toISOString(),
    };
  }

  async createQueue(queueName: string) {
    if (!validateQueueName(queueName)) {
      throw new BadRequestException('Invalid queue name');
    }

    const redis = this.redisService.getClient();

    // Check if queue already exists (has messages or metadata)
    const exists = await redis.exists(`queue:${queueName}:metadata`);
    if (exists) {
      throw new BadRequestException('Queue already exists');
    }

    // Create queue metadata to mark it as created
    const metadata = {
      createdAt: new Date().toISOString(),
      name: queueName,
    };

    await redis.set(`queue:${queueName}:metadata`, JSON.stringify(metadata));

    return {
      success: true,
      queue: queueName,
      timestamp: metadata.createdAt,
    };
  }

  async listQueues() {
    const redis = this.redisService.getClient();

    // Get all queue keys (both data and metadata)
    const keys = await redis.keys('queue:*');
    const queueDataKeys = keys.filter(
      (k) => !k.includes(':stats:') && !k.includes(':metadata'),
    );
    const metadataKeys = keys.filter((k) => k.includes(':metadata'));

    // Get all unique queue names
    const queueNames = new Set<string>();
    queueDataKeys.forEach((k) => queueNames.add(k.replace('queue:', '')));
    metadataKeys.forEach((k) =>
      queueNames.add(k.replace('queue:', '').replace(':metadata', '')),
    );

    const queues: QueueListItem[] = await Promise.all(
      Array.from(queueNames).map(async (queueName) => {
        const depth = await redis.llen(`queue:${queueName}`);

        // Get creation time from metadata
        let createdAt = null;
        const metadataStr = await redis.get(`queue:${queueName}:metadata`);
        if (metadataStr) {
          try {
            const metadata = JSON.parse(metadataStr);
            createdAt = metadata.createdAt;
          } catch (e) {
            // Ignore parse errors
          }
        }

        // Get oldest message for age calculation
        let oldestMessageAge = null;
        if (depth > 0) {
          const oldest = await redis.lindex(`queue:${queueName}`, -1);
          if (oldest) {
            try {
              const msg: QueueMessage = JSON.parse(oldest);
              oldestMessageAge =
                Date.now() - new Date(msg.enqueuedAt).getTime();
            } catch (e) {
              // Ignore parse errors
            }
          }
        }

        return {
          name: queueName,
          depth,
          oldestMessageAge,
          createdAt,
        };
      }),
    );

    return {
      queues,
      total: queues.length,
    };
  }

  async getQueueInfo(queueName: string): Promise<QueueInfo> {
    if (!validateQueueName(queueName)) {
      throw new BadRequestException('Invalid queue name');
    }

    const redis = this.redisService.getClient();
    const depth = await redis.llen(`queue:${queueName}`);

    if (depth === 0 && !(await redis.exists(`queue:${queueName}`))) {
      throw new NotFoundException('Queue not found');
    }

    // Get oldest and newest message timestamps
    let oldestMessageAge = null;
    let newestMessageAge = null;

    if (depth > 0) {
      const oldest = await redis.lindex(`queue:${queueName}`, -1);
      const newest = await redis.lindex(`queue:${queueName}`, 0);

      if (oldest) {
        try {
          const oldestMsg: QueueMessage = JSON.parse(oldest);
          oldestMessageAge =
            Date.now() - new Date(oldestMsg.enqueuedAt).getTime();
        } catch (e) {
          // Ignore parse errors
        }
      }

      if (newest) {
        try {
          const newestMsg: QueueMessage = JSON.parse(newest);
          newestMessageAge =
            Date.now() - new Date(newestMsg.enqueuedAt).getTime();
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    // Get stats from Redis
    const totalEnqueued = parseInt(
      (await redis.get(`queue:${queueName}:stats:enqueued`)) || '0',
      10,
    );
    const totalDequeued = parseInt(
      (await redis.get(`queue:${queueName}:stats:dequeued`)) || '0',
      10,
    );

    return {
      name: queueName,
      depth,
      stats: {
        totalEnqueued,
        totalDequeued,
        oldestMessageAge,
        newestMessageAge,
      },
    };
  }

  async deleteQueue(queueName: string) {
    if (!validateQueueName(queueName)) {
      throw new BadRequestException('Invalid queue name');
    }

    const redis = this.redisService.getClient();
    const depth = await redis.llen(`queue:${queueName}`);
    const metadataExists = await redis.exists(`queue:${queueName}:metadata`);

    if (
      depth === 0 &&
      !metadataExists &&
      !(await redis.exists(`queue:${queueName}`))
    ) {
      throw new NotFoundException('Queue not found');
    }

    // Delete queue, metadata, and stats
    await redis.del(`queue:${queueName}`);
    await redis.del(`queue:${queueName}:metadata`);
    await redis.del(`queue:${queueName}:stats:enqueued`);
    await redis.del(`queue:${queueName}:stats:dequeued`);

    return {
      success: true,
      queue: queueName,
      deletedMessages: depth,
      timestamp: new Date().toISOString(),
    };
  }

  async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    if (!validateQueueName(queueName)) {
      throw new BadRequestException('Invalid queue name');
    }

    const redis = this.redisService.getClient();
    const depth = await redis.llen(`queue:${queueName}`);

    // Get oldest message age
    let oldestMessageAge = null;
    if (depth > 0) {
      const oldest = await redis.lindex(`queue:${queueName}`, -1);
      if (oldest) {
        try {
          const msg: QueueMessage = JSON.parse(oldest);
          oldestMessageAge = Date.now() - new Date(msg.enqueuedAt).getTime();
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    // For now, return basic metrics
    // TODO: Implement rate tracking with Redis sorted sets or time-series
    return {
      queue: queueName,
      metrics: {
        depth,
        enqueueRate: {
          perSecond: 0,
          perMinute: 0,
          perHour: 0,
        },
        dequeueRate: {
          perSecond: 0,
          perMinute: 0,
          perHour: 0,
        },
        averageWaitTime: 0,
        oldestMessageAge,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getSystemStats(): Promise<SystemStats> {
    const redis = this.redisService.getClient();

    // Get all queue keys
    const keys = await redis.keys('queue:*');
    const queueKeys = keys.filter((k) => !k.includes(':stats:'));

    // Calculate total depth
    let totalDepth = 0;
    let activeCount = 0;
    for (const key of queueKeys) {
      const depth = await redis.llen(key);
      totalDepth += depth;
      if (depth > 0) activeCount++;
    }

    // Get Redis info
    const info = await redis.info('memory');
    const memoryUsed = parseRedisInfo(info, 'used_memory_human') || 'N/A';

    return {
      queues: {
        total: queueKeys.length,
        active: activeCount,
        empty: queueKeys.length - activeCount,
      },
      messages: {
        totalDepth,
      },
      redis: {
        memoryUsed,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
