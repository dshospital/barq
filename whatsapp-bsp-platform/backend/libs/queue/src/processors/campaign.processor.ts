import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Campaign, CampaignStatus } from '@app/shared';
import { CampaignQueueProducer, ICampaignJobData } from '../producers/campaign-queue.producer';
import { MessageQueueProducer } from '../producers/message-queue.producer';
import { Contact } from '@app/shared/entities/contact.entity';
import { v4 as uuidv4 } from 'uuid';

@Processor('campaigns', {
  concurrency: 5,
})
export class CampaignProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignProcessor.name);
  private readonly DEFAULT_BATCH_SIZE = 100;
  private readonly DEFAULT_THROTTLE_RATE = 80; // messages per second

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    private readonly messageQueueProducer: MessageQueueProducer,
    private readonly campaignQueueProducer: CampaignQueueProducer,
  ) {
    super();
  }

  async process(job: Job<ICampaignJobData>): Promise<any> {
    const { name, data } = job;

    switch (name) {
      case 'launch-campaign':
        return this.launchCampaign(job);
      case 'process-batch':
        return this.processBatch(job);
      default:
        throw new Error(`Unknown job type: ${name}`);
    }
  }

  private async launchCampaign(job: Job<ICampaignJobData>): Promise<any> {
    const { campaignId, organizationId, contactIds, batchSize, throttleRate } = job.data;

    this.logger.log(`Launching campaign: ${campaignId}`);

    try {
      // Update campaign status
      await this.campaignRepository.update(
        { id: campaignId },
        {
          status: CampaignStatus.RUNNING,
          startedAt: new Date(),
          totalRecipients: contactIds.length,
        },
      );

      // Split contacts into batches
      const effectiveBatchSize = batchSize || this.DEFAULT_BATCH_SIZE;
      const batches = this.chunkArray(contactIds, effectiveBatchSize);

      this.logger.log(`Campaign ${campaignId}: Split into ${batches.length} batches`);

      // Queue batch processing jobs
      for (let i = 0; i < batches.length; i++) {
        await this.campaignQueueProducer.processCampaignBatch(
          campaignId,
          i + 1,
          batches[i],
        );

        // Throttle batch creation to avoid overwhelming the queue
        if (i % 10 === 0) {
          await this.sleep(100);
        }
      }

      return {
        success: true,
        campaignId,
        totalBatches: batches.length,
        totalContacts: contactIds.length,
      };
    } catch (error) {
      this.logger.error(`Failed to launch campaign ${campaignId}: ${error.message}`);
      
      // Update campaign status to failed
      await this.campaignRepository.update(
        { id: campaignId },
        {
          status: CampaignStatus.PAUSED,
        },
      );

      throw error;
    }
  }

  private async processBatch(job: Job<{ campaignId: string; batchNumber: number; contactIds: string[] }>): Promise<any> {
    const { campaignId, batchNumber, contactIds } = job.data;

    this.logger.debug(`Processing batch ${batchNumber} for campaign ${campaignId}`);

    try {
      // Get campaign details
      const campaign = await this.campaignRepository.findOne({
        where: { id: campaignId },
        relations: ['template', 'account'],
      });

      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      if (campaign.status !== CampaignStatus.RUNNING) {
        this.logger.warn(`Campaign ${campaignId} is not running, skipping batch`);
        return { success: false, reason: 'Campaign not running' };
      }

      // Get contacts
      const contacts = await this.contactRepository.find({
        where: {
          id: In(contactIds),
          organizationId: campaign.organizationId,
        },
      });

      // Prepare messages
      const messages = contacts.map((contact) => ({
        messageId: uuidv4(),
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
        contactId: contact.id,
        phoneNumber: contact.phoneNumber,
        messageType: campaign.templateId ? 'template' : 'text',
        content: campaign.metadata?.templateParams || {},
        templateId: campaign.templateId,
        templateParams: this.buildTemplateParams(campaign, contact),
        accountId: campaign.accountId,
        priority: 5,
      }));

      // Add messages to queue
      await this.messageQueueProducer.addBulkMessages(messages);

      this.logger.debug(`Batch ${batchNumber} processed: ${messages.length} messages queued`);

      // Check if this is the last batch
      const progress = await this.campaignQueueProducer.getCampaignProgress(campaignId);
      if (progress.progress >= 100) {
        await this.completeCampaign(campaignId);
      }

      return {
        success: true,
        batchNumber,
        messagesQueued: messages.length,
      };
    } catch (error) {
      this.logger.error(`Failed to process batch ${batchNumber}: ${error.message}`);
      throw error;
    }
  }

  private buildTemplateParams(campaign: Campaign, contact: Contact): any[] {
    const params: any[] = [];
    
    if (!campaign.template) {
      return params;
    }

    // Build params based on template variables
    for (const variable of campaign.template.variables || []) {
      let value: string;

      switch (variable.name) {
        case 'first_name':
          value = contact.firstName || 'there';
          break;
        case 'last_name':
          value = contact.lastName || '';
          break;
        case 'full_name':
          value = contact.fullName || 'there';
          break;
        case 'phone_number':
          value = contact.phoneNumber;
          break;
        default:
          // Try to get from custom fields or metadata
          value = contact.customFields?.[variable.name] || 
                  campaign.metadata?.templateParams?.[variable.name] ||
                  variable.example ||
                  '';
      }

      params.push({
        type: variable.type,
        [variable.type === 'text' ? 'text' : 'value']: value,
      });
    }

    return params;
  }

  private async completeCampaign(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) return;

    // Check if all messages are processed
    const totalProcessed = campaign.sentCount + campaign.failedCount;
    
    if (totalProcessed >= campaign.totalRecipients) {
      await this.campaignRepository.update(
        { id: campaignId },
        {
          status: CampaignStatus.COMPLETED,
          completedAt: new Date(),
        },
      );

      this.logger.log(`Campaign ${campaignId} completed`);
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Campaign job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Campaign job ${job.id} failed: ${error.message}`);
  }
}
