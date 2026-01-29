import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { QueueModule } from '@app/queue';
import { MetaClientModule } from '@app/meta-client';
import { WebhookHandlerController } from './webhook-handler.controller';
import { WebhookHandlerService } from './webhook-handler.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    QueueModule,
    MetaClientModule,
  ],
  controllers: [WebhookHandlerController],
  providers: [WebhookHandlerService],
})
export class WebhookHandlerModule {}
