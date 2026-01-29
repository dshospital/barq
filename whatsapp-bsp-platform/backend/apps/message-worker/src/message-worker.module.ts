import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { QueueModule } from '@app/queue';
import { MetaClientModule } from '@app/meta-client';
import { AiClientModule } from '@app/ai-client';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    QueueModule,
    MetaClientModule,
    AiClientModule,
  ],
})
export class MessageWorkerModule {}
