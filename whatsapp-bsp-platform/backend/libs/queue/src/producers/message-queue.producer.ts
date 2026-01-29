import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { IMessageQueueData } from '@app/shared';

@Injectable()
export class MessageQueueProducer {
  private readonly logger = new Logger(MessageQueueProducer.name);

  constructor(
    @InjectQueue('messages') private readonly messageQueue: Queue,
  ) {}

  async addMessage(data: IMessageQueueData, priority?: number): Promise<Job> {
    try {
      const job = await this.messageQueue.add(
        'send-message',
        data,
        {
          priority: priority || 5,
          jobId: `msg:${data.messageId}`,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 3600, // 1 hour
            count: 1000,
          },
          removeOnFail: {
            age: 86400, // 24 hours
            count: 500,
          },
        },
      );

      this.logger.debug(`Message job added: ${job.id} for message: ${data.messageId}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to add message job: ${error.message}`, error.stack);
      throw error;
    }
  }

  async addBulkMessages(messages: IMessageQueueData[]): Promise<Job[]> {
    try {
      const jobs = messages.map((data) => ({
        name: 'send-message',
        data,
        opts: {
          priority: data.priority || 5,
          jobId: `msg:${data.messageId}`,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }));

      const result = await this.messageQueue.addBulk(jobs);
      this.logger.debug(`Bulk messages added: ${result.length} jobs`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to add bulk messages: ${error.message}`, error.stack);
      throw error;
    }
  }

  async scheduleMessage(data: IMessageQueueData, delay: number): Promise<Job> {
    try {
      const job = await this.messageQueue.add(
        'send-message',
        data,
        {
          delay,
          priority: 3,
          jobId: `msg:scheduled:${data.messageId}`,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      this.logger.debug(`Scheduled message job: ${job.id} for: ${new Date(Date.now() + delay)}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to schedule message: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<any> {
    const job = await this.messageQueue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  async removeJob(jobId: string): Promise<void> {
    const job = await this.messageQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.debug(`Job removed: ${jobId}`);
    }
  }

  async pauseQueue(): Promise<void> {
    await this.messageQueue.pause();
    this.logger.warn('Message queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.messageQueue.resume();
    this.logger.log('Message queue resumed');
  }

  async getQueueStats(): Promise<any> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.messageQueue.getWaitingCount(),
      this.messageQueue.getActiveCount(),
      this.messageQueue.getCompletedCount(),
      this.messageQueue.getFailedCount(),
      this.messageQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }

  async cleanQueue(gracePeriod: number = 3600000, status: ('completed' | 'failed')[] = ['completed']): Promise<void> {
    await this.messageQueue.clean(gracePeriod, 1000, status);
    this.logger.log(`Queue cleaned: ${status.join(', ')}`);
  }
}
