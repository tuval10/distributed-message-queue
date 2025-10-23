import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class HealthService {
  constructor(private readonly redisService: RedisService) {}

  async getHealthStatus() {
    const redisStatus = this.redisService.isReady()
      ? 'connected'
      : 'disconnected';
    const isHealthy = redisStatus === 'connected';

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      redis: redisStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      isHealthy,
    };
  }
}
