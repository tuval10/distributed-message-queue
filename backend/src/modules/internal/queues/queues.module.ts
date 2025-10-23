import { Module } from '@nestjs/common';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';
import { RedisModule } from '../../../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [QueuesController],
  providers: [QueuesService],
})
export class QueuesModule {}
