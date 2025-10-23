import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiService } from './api.service';

/**
 * API Controller - Simple REST API for queue operations
 * Based on PRD.md specification
 *
 * Endpoints:
 * - POST /api/{queue_name} - Enqueue message
 * - GET /api/{queue_name}?timeout={ms} - Dequeue message
 */
@Controller('api')
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

  /**
   * POST /api/{queue_name}
   * Enqueue a message to the specified queue
   */
  @Post(':queueName')
  @HttpCode(HttpStatus.CREATED)
  async enqueue(@Param('queueName') queueName: string, @Body() message: any) {
    try {
      return await this.apiService.enqueue(queueName, message);
    } catch (error) {
      console.error('Enqueue error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Internal server error');
    }
  }

  /**
   * GET /api/{queue_name}?timeout={ms}
   * Dequeue a message from the specified queue
   * Returns 204 No Content if no message is available after timeout
   */
  @Get(':queueName')
  async dequeue(
    @Param('queueName') queueName: string,
    @Query('timeout') timeout?: string,
    @Res() res?: Response,
  ) {
    try {
      // Parse timeout
      const timeoutMs = parseInt(timeout || '10000', 10);
      const message = await this.apiService.dequeue(queueName, timeoutMs);

      // Return 204 No Content if no message available (timeout)
      if (message === null) {
        return res.status(HttpStatus.NO_CONTENT).send();
      }

      // Return the message with 200 OK
      return res.status(HttpStatus.OK).json(message);
    } catch (error) {
      console.error('Dequeue error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Internal server error');
    }
  }
}
