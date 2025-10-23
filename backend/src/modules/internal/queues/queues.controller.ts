import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ValidationPipe,
} from '@nestjs/common';
import { QueuesService } from './queues.service';
import { EnqueueMessageDto, BulkEnqueueDto } from '../../../dto/enqueue.dto';

/**
 * Queues Controller - Full Queue Management API
 * Based on internal_controller.md specification
 *
 * Queue Operations:
 * - POST /internal/queues - Create queue
 * - POST /internal/queues/{queue_name}/messages - Enqueue message
 * - GET /internal/queues/{queue_name}/messages - Dequeue message
 * - GET /internal/queues/{queue_name}/messages/peek - Peek at messages
 * - POST /internal/queues/{queue_name}/messages/bulk - Bulk enqueue
 * - DELETE /internal/queues/{queue_name}/messages - Purge queue
 *
 * Queue Management:
 * - GET /internal/queues - List all queues
 * - GET /internal/queues/{queue_name} - Get queue info
 * - DELETE /internal/queues/{queue_name} - Delete queue
 * - GET /internal/queues/{queue_name}/metrics - Get queue metrics
 *
 * System:
 * - GET /api/stats - System statistics
 */
@Controller('internal/queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  /**
   * POST /internal/queues
   * Create a new queue
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createQueue(@Body() body: { name: string }) {
    try {
      return await this.queuesService.createQueue(body.name);
    } catch (error) {
      console.error('Create queue error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Internal server error');
    }
  }

  /**
   * POST /internal/queues/{queue_name}/messages
   * Enqueue a message to the specified queue
   */
  @Post(':queueName/messages')
  @HttpCode(HttpStatus.CREATED)
  async enqueueMessage(
    @Param('queueName') queueName: string,
    @Body(ValidationPipe) dto: EnqueueMessageDto,
  ) {
    try {
      return await this.queuesService.enqueueMessage(queueName, dto);
    } catch (error) {
      console.error('Enqueue error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Internal server error');
    }
  }

  /**
   * GET /internal/queues/{queue_name}/messages?timeout={ms}
   * Dequeue a message from the specified queue
   */
  @Get(':queueName/messages')
  async dequeueMessage(
    @Param('queueName') queueName: string,
    @Query('timeout') timeout?: string,
  ) {
    try {
      const timeoutMs = parseInt(timeout || '10000', 10);
      return await this.queuesService.dequeueMessage(queueName, timeoutMs);
    } catch (error) {
      console.error('Dequeue error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Internal server error');
    }
  }

  /**
   * GET /internal/queues/{queue_name}/messages/peek?count={n}
   * View messages in the queue without removing them
   */
  @Get(':queueName/messages/peek')
  async peekMessages(
    @Param('queueName') queueName: string,
    @Query('count') count?: string,
  ) {
    try {
      const messageCount = parseInt(count || '10', 10);
      return await this.queuesService.peekMessages(queueName, messageCount);
    } catch (error) {
      console.error('Peek error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Internal server error');
    }
  }

  /**
   * POST /internal/queues/{queue_name}/messages/bulk
   * Bulk enqueue multiple messages
   */
  @Post(':queueName/messages/bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkEnqueue(
    @Param('queueName') queueName: string,
    @Body(ValidationPipe) dto: BulkEnqueueDto,
  ) {
    try {
      return await this.queuesService.bulkEnqueue(queueName, dto);
    } catch (error) {
      console.error('Bulk enqueue error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Internal server error');
    }
  }

  /**
   * DELETE /internal/queues/{queue_name}/messages
   * Purge all messages from a queue
   */
  @Delete(':queueName/messages')
  async purgeQueue(@Param('queueName') queueName: string) {
    try {
      return await this.queuesService.purgeQueue(queueName);
    } catch (error) {
      console.error('Purge error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Internal server error');
    }
  }

  /**
   * GET /internal/queues
   * List all queues
   */
  @Get()
  async listQueues() {
    try {
      return await this.queuesService.listQueues();
    } catch (error) {
      console.error('List queues error:', error);
      throw new InternalServerErrorException('Internal server error');
    }
  }

  /**
   * GET /internal/queues/{queue_name}
   * Get detailed information about a specific queue
   */
  @Get(':queueName')
  async getQueueInfo(@Param('queueName') queueName: string) {
    try {
      return await this.queuesService.getQueueInfo(queueName);
    } catch (error) {
      console.error('Get queue info error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Internal server error');
    }
  }

  /**
   * DELETE /internal/queues/{queue_name}
   * Delete a queue and all its messages
   */
  @Delete(':queueName')
  async deleteQueue(@Param('queueName') queueName: string) {
    try {
      return await this.queuesService.deleteQueue(queueName);
    } catch (error) {
      console.error('Delete queue error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Internal server error');
    }
  }

  /**
   * GET /internal/queues/{queue_name}/metrics
   * Get detailed metrics for a queue
   */
  @Get(':queueName/metrics')
  async getQueueMetrics(@Param('queueName') queueName: string) {
    try {
      return await this.queuesService.getQueueMetrics(queueName);
    } catch (error) {
      console.error('Get queue metrics error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Internal server error');
    }
  }

  /**
   * GET /api/stats
   * Get overall system statistics
   */
  @Get('../stats')
  async getSystemStats() {
    try {
      return await this.queuesService.getSystemStats();
    } catch (error) {
      console.error('Get system stats error:', error);
      throw new InternalServerErrorException('Internal server error');
    }
  }
}
