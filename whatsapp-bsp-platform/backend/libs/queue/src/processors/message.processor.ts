import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IMessageQueueData, MessageStatus } from '@app/shared';
import { MetaClientService } from '@app/meta-client';
import { Campaign } from '@app/shared/entities/campaign.entity';
import { Message, MessageDocument } from '@app/database/schemas/message.schema';

@Processor('messages', {
  concurrency: 10,
  limiter: {
    max: 80, // Max 80 jobs per second (respecting Meta's rate limits)
    duration: 1000,
  },
})
export class MessageProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageProcessor.name);

  constructor(
    private readonly metaClient: MetaClientService,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {
    super();
  }

  async process(job: Job<IMessageQueueData>): Promise<any> {
    const { data } = job;
    
    this.logger.debug(`Processing message job: ${job.id}, message: ${data.messageId}`);

    try {
      // Update message status to processing
      await this.updateMessageStatus(data.messageId, MessageStatus.PENDING);

      // Send message via Meta API
      const result = await this.sendMessage(data);

      // Update message status based on result
      if (result.success) {
        await this.updateMessageStatus(
          data.messageId, 
          MessageStatus.SENT,
          {
            waMessageId: result.waMessageId,
            sentAt: new Date(),
          }
        );

        // Update campaign stats if part of campaign
        if (data.campaignId) {
          await this.updateCampaignStats(data.campaignId, 'sent');
        }

        this.logger.debug(`Message sent successfully: ${data.messageId}`);
      } else {
        throw new Error(result.error || 'Failed to send message');
      }

      return {
        success: true,
        messageId: data.messageId,
        waMessageId: result.waMessageId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process message ${data.messageId}: ${error.message}`,
        error.stack,
      );

      // Update message status to failed
      await this.updateMessageStatus(
        data.messageId,
        MessageStatus.FAILED,
        {
          errorCode: error.code || 'UNKNOWN_ERROR',
          errorMessage: error.message,
          failedAt: new Date(),
        }
      );

      // Update campaign stats if part of campaign
      if (data.campaignId) {
        await this.updateCampaignStats(data.campaignId, 'failed');
      }

      // Throw error to trigger retry
      throw error;
    }
  }

  private async sendMessage(data: IMessageQueueData): Promise<any> {
    const { messageType, content, phoneNumber, templateId, templateParams, accountId } = data;

    switch (messageType) {
      case 'text':
        return this.metaClient.sendTextMessage(accountId, phoneNumber, content.text);

      case 'image':
        return this.metaClient.sendMediaMessage(
          accountId,
          phoneNumber,
          'image',
          content.mediaUrl,
          content.caption,
        );

      case 'video':
        return this.metaClient.sendMediaMessage(
          accountId,
          phoneNumber,
          'video',
          content.mediaUrl,
          content.caption,
        );

      case 'document':
        return this.metaClient.sendDocumentMessage(
          accountId,
          phoneNumber,
          content.mediaUrl,
          content.filename,
          content.caption,
        );

      case 'template':
        if (!templateId) {
          throw new Error('Template ID is required for template messages');
        }
        return this.metaClient.sendTemplateMessage(
          accountId,
          phoneNumber,
          templateId,
          templateParams || [],
        );

      case 'location':
        return this.metaClient.sendLocationMessage(
          accountId,
          phoneNumber,
          content.latitude,
          content.longitude,
          content.name,
          content.address,
        );

      case 'interactive':
        return this.metaClient.sendInteractiveMessage(
          accountId,
          phoneNumber,
          content,
        );

      default:
        throw new Error(`Unsupported message type: ${messageType}`);
    }
  }

  private async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    additionalData?: any,
  ): Promise<void> {
    try {
      const update: any = {
        status,
        updatedAt: new Date(),
      };

      // Add status to history
      const statusEntry = {
        status,
        timestamp: new Date(),
        ...additionalData,
      };

      await this.messageModel.findByIdAndUpdate(
        messageId,
        {
          $set: update,
          $push: { statusHistory: statusEntry },
          ...additionalData,
        },
        { new: true },
      );
    } catch (error) {
      this.logger.error(`Failed to update message status: ${error.message}`);
    }
  }

  private async updateCampaignStats(
    campaignId: string,
    event: 'sent' | 'delivered' | 'read' | 'failed',
  ): Promise<void> {
    try {
      const fieldMap = {
        sent: 'sentCount',
        delivered: 'deliveredCount',
        read: 'readCount',
        failed: 'failedCount',
      };

      await this.campaignRepository.increment(
        { id: campaignId },
        fieldMap[event],
        1,
      );
    } catch (error) {
      this.logger.error(`Failed to update campaign stats: ${error.message}`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`Job ${jobId} has stalled`);
  }
}
