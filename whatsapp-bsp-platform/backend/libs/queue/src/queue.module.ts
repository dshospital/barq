import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessageQueueProducer } from './producers/message-queue.producer';
import { WebhookQueueProducer } from './producers/webhook-queue.producer';
import { CampaignQueueProducer } from './producers/campaign-queue.producer';
import { MessageProcessor } from './processors/message.processor';
import { WebhookProcessor } from './processors/webhook.processor';
import { CampaignProcessor } from './processors/campaign.processor';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'messages' },
      { name: 'webhooks' },
      { name: 'campaigns' },
      { name: 'ai-processing' },
      { name: 'notifications' },
    ),
  ],
  providers: [
    MessageQueueProducer,
    WebhookQueueProducer,
    CampaignQueueProducer,
    MessageProcessor,
    WebhookProcessor,
    CampaignProcessor,
  ],
  exports: [
    MessageQueueProducer,
    WebhookQueueProducer,
    CampaignQueueProducer,
    BullModule,
  ],
})
export class QueueModule {}
