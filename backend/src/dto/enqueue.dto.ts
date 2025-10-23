import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class EnqueueMessageDto {
  @IsNotEmpty()
  message: any;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BulkEnqueueDto {
  @IsNotEmpty()
  messages: any[];
}
