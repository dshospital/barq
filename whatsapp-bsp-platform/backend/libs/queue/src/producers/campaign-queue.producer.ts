import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';

export interface ICampaignJobData {
  campaignId: string;
  organizationId: string;
  accountId: string;
  templateId?: string;
  contactIds: string[];
  batchSize?: number;
  throttleRate?: number;
  metadata?: any;
}

@Injectable()
export class CampaignQueueProducer {
  private readonly logger = new Logger(CampaignQueueProducer.name);

  constructor(
    @InjectQueue('campaigns') private readonly campaignQueue: Queue,
  ) {}

  async launchCampaign(data: ICampaignJobData): Promise<Job> {
    try {
      const job = await this.campaignQueue.add(
        'launch-campaign',
        data,
        {
          jobId: `campaign:${data.campaignId}`,
          attempts: 3,
          backoff: {
            type: 'fixed',
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

      this.logger.log(`Campaign job added: ${job.id} for campaign: ${data.campaignId}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to launch campaign: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processCampaignBatch(campaignId: string, batchNumber: number, contactIds: string[]): Promise<Job> {
    try {
      const job = await this.campaignQueue.add(
        'process-batch',
        {
          campaignId,
          batchNumber,
          contactIds,
        },
        {
          jobId: `campaign:${campaignId}:batch:${batchNumber}`,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );

      this.logger.debug(`Campaign batch job added: ${job.id} for batch: ${batchNumber}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to process campaign batch: ${error.message}`, error.stack);
      throw error;
    }
  }

  async scheduleCampaign(data: ICampaignJobData, delay: number): Promise<Job> {
    try {
      const job = await this.campaignQueue.add(
        'launch-campaign',
        data,
        {
          delay,
          jobId: `campaign:scheduled:${data.campaignId}`,
          attempts: 3,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
        },
      );

      this.logger.log(`Campaign scheduled: ${job.id} for: ${new Date(Date.now() + delay)}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to schedule campaign: ${error.message}`, error.stack);
      throw error;
    }
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    const jobs = await this.campaignQueue.getJobs(['waiting', 'delayed']);
    const campaignJobs = jobs.filter(job => 
      job.data.campaignId === campaignId || 
      job.opts.jobId?.startsWith(`campaign:${campaignId}`)
    );

    for (const job of campaignJobs) {
      await job.pause();
    }

    this.logger.log(`Campaign paused: ${campaignId}, ${campaignJobs.length} jobs affected`);
  }

  async resumeCampaign(campaignId: string): Promise<void> {
    const jobs = await this.campaignQueue.getJobs(['paused']);
    const campaignJobs = jobs.filter(job => 
      job.data.campaignId === campaignId || 
      job.opts.jobId?.startsWith(`campaign:${campaignId}`)
    );

    for (const job of campaignJobs) {
      await job.resume();
    }

    this.logger.log(`Campaign resumed: ${campaignId}, ${campaignJobs.length} jobs affected`);
  }

  async cancelCampaign(campaignId: string): Promise<number> {
    const jobs = await this.campaignQueue.getJobs(['waiting', 'active', 'delayed', 'paused']);
    const campaignJobs = jobs.filter(job => 
      job.data.campaignId === campaignId || 
      job.opts.jobId?.startsWith(`campaign:${campaignId}`)
    );

    for (const job of campaignJobs) {
      await job.remove();
    }

    this.logger.log(`Campaign cancelled: ${campaignId}, ${campaignJobs.length} jobs removed`);
    return campaignJobs.length;
  }

  async getCampaignProgress(campaignId: string): Promise<any> {
    const jobs = await this.campaignQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
    const campaignJobs = jobs.filter(job => 
      job.opts.jobId?.startsWith(`campaign:${campaignId}`)
    );

    const waiting = campaignJobs.filter(j => j.isWaiting()).length;
    const active = campaignJobs.filter(j => j.isActive()).length;
    const completed = campaignJobs.filter(j => j.isCompleted()).length;
    const failed = campaignJobs.filter(j => j.isFailed()).length;

    return {
      campaignId,
      waiting,
      active,
      completed,
      failed,
      total: campaignJobs.length,
      progress: campaignJobs.length > 0 ? Math.round((completed / campaignJobs.length) * 100) : 0,
    };
  }
}
