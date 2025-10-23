import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

/**
 * Health Controller
 * Provides health check endpoint for monitoring and Cloud Run
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async checkHealth(@Res() res: Response) {
    const health = await this.healthService.getHealthStatus();

    if (health.isHealthy) {
      return res.status(HttpStatus.OK).json(health);
    } else {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(health);
    }
  }
}
