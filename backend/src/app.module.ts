import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { ApiModule } from './modules/api/api.module';
import { QueuesModule } from './modules/internal/queues/queues.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    RedisModule,
    HealthModule,
    ApiModule,
    QueuesModule,
  ],
})
export class AppModule {}
