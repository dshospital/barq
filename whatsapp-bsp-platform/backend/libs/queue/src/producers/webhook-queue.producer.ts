import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { IWebhookQueueData } from '@app/shared';

export interface IOutgoingWebhookData {
  webhookId: string;
  organizationId: string;
  url: string;
  secret: string;
  event: string;
  payload: any;
  retryCount?: number;
}

@Injectable()
export class WebhookQueueProducer {
  private readonly logger = new Logger(WebhookQueueProducer.name);

  constructor(
    @InjectQueue('webhooks') private readonly webhookQueue: Queue,
  ) {}

  async processIncomingWebhook(data: IWebhookQueueData): Promise<Job> {
    try {
      const job = await this.webhookQueue.add(
        'process-incoming',
        data,
        {
          jobId: `webhook:in:${data.webhookId}:${Date.now()}`,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            age: 3600, // 1 hour
          },
          removeOnFail: {
            age: 86400, // 24 hours
          },
        },
      );

      this.logger.debug(`Incoming webhook job added: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to process incoming webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendOutgoingWebhook(data: IOutgoingWebhookData): Promise<Job> {
    try {
      const job = await this.webhookQueue.add(
        'send-outgoing',
        data,
        {
          jobId: `webhook:out:${data.webhookId}:${Date.now()}`,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: {
            age: 86400, // 24 hours
          },
          removeOnFail: {
            age: 604800, // 7 days
          },
        },
      );

      this.logger.debug(`Outgoing webhook job added: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to send outgoing webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendBulkOutgoingWebhooks(webhooks: IOutgoingWebhookData[]): Promise<Job[]> {
    try {
      const jobs = webhooks.map((data, index) => ({
        name: 'send-outgoing',
        data,
        opts: {
          jobId: `webhook:out:bulk:${data.webhookId}:${Date.now()}:${index}`,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      }));

      const result = await this.webhookQueue.addBulk(jobs);
      this.logger.debug(`Bulk outgoing webhooks added: ${result.length} jobs`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send bulk webhooks: ${error.message}`, error.stack);
      throw error;
    }
  }

  async retryFailedWebhook(webhookId: string, payload: any): Promise<Job> {
    try {
      const job = await this.webhookQueue.add(
        'send-outgoing',
        {
          webhookId,
          payload,
          isRetry: true,
        },
        {
          delay: 60000, // 1 minute delay for retry
          jobId: `webhook:retry:${webhookId}:${Date.now()}`,
          attempts: 3,
          backoff: {
            type: 'fixed',
            delay: 30000,
          },
        },
      );

      this.logger.debug(`Webhook retry job added: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to retry webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getFailedWebhooks(): Promise<Job[]> {
    return this.webhookQueue.getJobs(['failed']);
  }

  async retryAllFailed(): Promise<number> {
    const failedJobs = await this.getFailedWebhooks();
    let retried = 0;

    for (const job of failedJobs) {
      try {
        await job.retry();
        retried++;
      } catch (error) {
        this.logger.warn(`Failed to retry job ${job.id}: ${error.message}`);
      }
    }

    this.logger.log(`Retried ${retried} failed webhook jobs`);
    return retried;
  }
}
