import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  IWebhookQueueData, 
  IOutgoingWebhookData,
  IMetaWebhookPayload,
  MessageStatus,
  MetaMessageStatus,
  MessageType,
} from '@app/shared';
import { Message, MessageDocument } from '@app/database/schemas/message.schema';
import { Conversation, ConversationDocument } from '@app/database/schemas/conversation.schema';
import { Contact } from '@app/shared/entities/contact.entity';
import { AiClientService } from '@app/ai-client';
import { WebhookQueueProducer } from '../producers/webhook-queue.producer';

interface IProcessIncomingData extends IWebhookQueueData {
  payload: IMetaWebhookPayload;
}

@Processor('webhooks', {
  concurrency: 20,
})
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    private readonly aiClient: AiClientService,
    private readonly webhookProducer: WebhookQueueProducer,
  ) {
    super();
  }

  async process(job: Job<IWebhookQueueData | IOutgoingWebhookData>): Promise<any> {
    const { name, data } = job;

    switch (name) {
      case 'process-incoming':
        return this.processIncomingWebhook(job as Job<IProcessIncomingData>);
      case 'send-outgoing':
        return this.processOutgoingWebhook(job as Job<IOutgoingWebhookData>);
      default:
        throw new Error(`Unknown job type: ${name}`);
    }
  }

  private async processIncomingWebhook(job: Job<IProcessIncomingData>): Promise<any> {
    const { payload, organizationId } = job.data;

    this.logger.debug(`Processing incoming webhook for org: ${organizationId}`);

    const results = [];

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const { value } = change;

        // Process messages
        if (value.messages && value.messages.length > 0) {
          for (const message of value.messages) {
            const result = await this.processIncomingMessage(message, value, organizationId);
            results.push(result);
          }
        }

        // Process status updates
        if (value.statuses && value.statuses.length > 0) {
          for (const status of value.statuses) {
            const result = await this.processStatusUpdate(status, organizationId);
            results.push(result);
          }
        }
      }
    }

    return { processed: results.length, results };
  }

  private async processIncomingMessage(
    message: any,
    value: any,
    organizationId: string,
  ): Promise<any> {
    try {
      const phoneNumber = message.from;
      const phoneNumberId = value.metadata.phone_number_id;
      const contactInfo = value.contacts?.[0];

      // Find or create contact
      const contact = await this.findOrCreateContact(
        organizationId,
        phoneNumber,
        contactInfo,
      );

      // Find or create conversation
      const conversation = await this.findOrCreateConversation(
        organizationId,
        contact.id,
        phoneNumberId,
        message.context?.id,
      );

      // Determine message type and content
      const { messageType, content } = this.parseMessageContent(message);

      // Create message document
      const messageDoc = await this.messageModel.create({
        organizationId,
        conversationId: conversation._id,
        contactId: contact.id,
        direction: 'inbound',
        messageType,
        content,
        waMessageId: message.id,
        waConversationId: message.context?.id,
        status: MessageStatus.DELIVERED,
        statusHistory: [
          {
            status: MessageStatus.DELIVERED,
            timestamp: new Date(),
          },
        ],
        deliveredAt: new Date(parseInt(message.timestamp) * 1000),
        rawWebhook: message,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update conversation
      await this.updateConversationWithNewMessage(conversation, messageDoc, contact);

      // AI Processing (if enabled)
      const organization = await this.getOrganizationSettings(organizationId);
      if (organization?.settings?.aiEnabled && messageType === MessageType.TEXT) {
        await this.processWithAI(messageDoc, conversation, organizationId);
      }

      // Notify outgoing webhooks
      await this.notifyOutgoingWebhooks(organizationId, 'message.received', {
        message: messageDoc,
        contact,
        conversation,
      });

      this.logger.debug(`Incoming message processed: ${message.id}`);

      return {
        success: true,
        messageId: messageDoc._id,
        type: 'incoming_message',
      };
    } catch (error) {
      this.logger.error(
        `Failed to process incoming message: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async processStatusUpdate(status: any, organizationId: string): Promise<any> {
    try {
      const { id: waMessageId, status: metaStatus } = status;

      // Find message by WhatsApp ID
      const message = await this.messageModel.findOne({ waMessageId });

      if (!message) {
        this.logger.warn(`Message not found for status update: ${waMessageId}`);
        return { success: false, error: 'Message not found' };
      }

      // Map Meta status to our status
      const ourStatus = this.mapMetaStatus(metaStatus);

      // Update message status
      const update: any = {
        status: ourStatus,
        updatedAt: new Date(),
      };

      // Add timestamp based on status
      const timestamp = new Date(parseInt(status.timestamp) * 1000);
      if (metaStatus === MetaMessageStatus.SENT) {
        update.sentAt = timestamp;
      } else if (metaStatus === MetaMessageStatus.DELIVERED) {
        update.deliveredAt = timestamp;
      } else if (metaStatus === MetaMessageStatus.READ) {
        update.readAt = timestamp;
      } else if (metaStatus === MetaMessageStatus.FAILED) {
        update.failedAt = timestamp;
        update.errorCode = status.errors?.[0]?.code;
        update.errorMessage = status.errors?.[0]?.title;
      }

      // Add to status history
      const statusEntry = {
        status: ourStatus,
        timestamp: new Date(),
        errorCode: status.errors?.[0]?.code,
        errorMessage: status.errors?.[0]?.title,
      };

      await this.messageModel.findByIdAndUpdate(message._id, {
        $set: update,
        $push: { statusHistory: statusEntry },
      });

      // Notify outgoing webhooks
      await this.notifyOutgoingWebhooks(organizationId, 'message.status_updated', {
        messageId: message._id,
        waMessageId,
        status: ourStatus,
        timestamp,
      });

      this.logger.debug(`Status update processed: ${waMessageId} -> ${ourStatus}`);

      return {
        success: true,
        messageId: message._id,
        type: 'status_update',
        status: ourStatus,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process status update: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async processOutgoingWebhook(job: Job<IOutgoingWebhookData>): Promise<any> {
    const { url, secret, event, payload } = job.data;

    try {
      const axios = (await import('axios')).default;
      const crypto = await import('crypto');

      // Generate signature
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      // Send webhook
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': event,
          'X-Webhook-Timestamp': Date.now().toString(),
        },
        timeout: 30000,
        validateStatus: () => true, // Don't throw on error status
      });

      if (response.status >= 200 && response.status < 300) {
        this.logger.debug(`Outgoing webhook sent successfully: ${url}`);
        return { success: true, statusCode: response.status };
      } else {
        throw new Error(`Webhook returned status ${response.status}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send outgoing webhook: ${error.message}`);
      throw error;
    }
  }

  private async findOrCreateContact(
    organizationId: string,
    phoneNumber: string,
    contactInfo?: any,
  ): Promise<Contact> {
    let contact = await this.contactRepository.findOne({
      where: { organizationId, phoneNumber },
    });

    if (!contact) {
      contact = this.contactRepository.create({
        organizationId,
        phoneNumber,
        firstName: contactInfo?.profile?.name?.split(' ')[0],
        lastName: contactInfo?.profile?.name?.split(' ').slice(1).join(' '),
        consentStatus: 'opted_in',
        consentUpdatedAt: new Date(),
        customFields: {},
        tags: [],
      });
      await this.contactRepository.save(contact);
      this.logger.debug(`New contact created: ${contact.id}`);
    }

    return contact;
  }

  private async findOrCreateConversation(
    organizationId: string,
    contactId: string,
    accountId: string,
    waConversationId?: string,
  ): Promise<ConversationDocument> {
    let conversation = await this.conversationModel.findOne({
      organizationId,
      contactId,
      accountId,
      status: 'active',
    });

    if (!conversation) {
      conversation = await this.conversationModel.create({
        organizationId,
        contactId,
        accountId,
        waConversationId,
        status: 'active',
        priority: 'medium',
        messageCount: { incoming: 0, outgoing: 0 },
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      this.logger.debug(`New conversation created: ${conversation._id}`);
    }

    return conversation;
  }

  private async updateConversationWithNewMessage(
    conversation: ConversationDocument,
    message: MessageDocument,
    contact: Contact,
  ): Promise<void> {
    const isIncoming = message.direction === 'inbound';
    
    await this.conversationModel.findByIdAndUpdate(conversation._id, {
      lastMessageAt: new Date(),
      lastMessagePreview: message.content.text?.substring(0, 100) || '[Media]',
      $inc: {
        'messageCount.incoming': isIncoming ? 1 : 0,
        'messageCount.outgoing': isIncoming ? 0 : 1,
      },
      updatedAt: new Date(),
    });

    // Update contact's last interaction
    await this.contactRepository.update(
      { id: contact.id },
      {
        lastInteraction: new Date(),
        totalMessagesReceived: () => 'total_messages_received + 1',
      },
    );
  }

  private async processWithAI(
    message: MessageDocument,
    conversation: ConversationDocument,
    organizationId: string,
  ): Promise<void> {
    try {
      const analysis = await this.aiClient.analyzeMessage(message.content.text, {
        conversationHistory: [],
        contactInfo: { id: message.contactId },
      });

      // Update message with AI analysis
      await this.messageModel.findByIdAndUpdate(message._id, {
        'aiProcessing.processed': true,
        'aiProcessing.sentiment': analysis.sentiment,
        'aiProcessing.intent': analysis.intent,
        'aiProcessing.suggestedReplies': analysis.suggestedReplies,
      });

      // Update conversation with AI analysis
      await this.conversationModel.findByIdAndUpdate(conversation._id, {
        'aiAnalysis.sentiment': analysis.sentiment,
        'aiAnalysis.sentimentScore': analysis.sentimentScore,
        'aiAnalysis.intent': analysis.intent,
        'aiAnalysis.language': analysis.language,
        'aiAnalysis.summary': analysis.summary,
      });

      this.logger.debug(`AI processing completed for message: ${message._id}`);
    } catch (error) {
      this.logger.error(`AI processing failed: ${error.message}`);
      // Don't throw - AI failure shouldn't break message processing
    }
  }

  private async notifyOutgoingWebhooks(
    organizationId: string,
    event: string,
    payload: any,
  ): Promise<void> {
    try {
      // Get active webhooks for this organization and event
      const { Webhook } = await import('@app/shared/entities/webhook.entity');
      const webhooks = await this.contactRepository.manager.find(Webhook, {
        where: {
          organizationId,
          status: 'active',
        },
      });

      const matchingWebhooks = webhooks.filter(w => 
        w.events.includes(event) || w.events.includes('*')
      );

      for (const webhook of matchingWebhooks) {
        await this.webhookProducer.sendOutgoingWebhook({
          webhookId: webhook.id,
          organizationId,
          url: webhook.url,
          secret: webhook.secret,
          event,
          payload,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to notify webhooks: ${error.message}`);
      // Don't throw - webhook notification failure shouldn't break processing
    }
  }

  private parseMessageContent(message: any): { messageType: MessageType; content: any } {
    const type = message.type;

    switch (type) {
      case 'text':
        return {
          messageType: MessageType.TEXT,
          content: { text: message.text.body },
        };

      case 'image':
        return {
          messageType: MessageType.IMAGE,
          content: {
            mediaId: message.image.id,
            mimeType: message.image.mime_type,
            caption: message.image.caption,
            sha256: message.image.sha256,
          },
        };

      case 'video':
        return {
          messageType: MessageType.VIDEO,
          content: {
            mediaId: message.video.id,
            mimeType: message.video.mime_type,
            caption: message.video.caption,
          },
        };

      case 'audio':
      case 'voice':
        return {
          messageType: MessageType.AUDIO,
          content: {
            mediaId: message.audio?.id || message.voice?.id,
            mimeType: message.audio?.mime_type || message.voice?.mime_type,
          },
        };

      case 'document':
        return {
          messageType: MessageType.DOCUMENT,
          content: {
            mediaId: message.document.id,
            mimeType: message.document.mime_type,
            filename: message.document.filename,
            caption: message.document.caption,
          },
        };

      case 'location':
        return {
          messageType: MessageType.LOCATION,
          content: {
            latitude: message.location.latitude,
            longitude: message.location.longitude,
            name: message.location.name,
            address: message.location.address,
          },
        };

      case 'interactive':
        return {
          messageType: MessageType.INTERACTIVE,
          content: {
            type: message.interactive.type,
            buttonReply: message.interactive.button_reply,
            listReply: message.interactive.list_reply,
          },
        };

      default:
        return {
          messageType: MessageType.TEXT,
          content: { text: '[Unsupported message type]' },
        };
    }
  }

  private mapMetaStatus(metaStatus: string): MessageStatus {
    const statusMap: Record<string, MessageStatus> = {
      sent: MessageStatus.SENT,
      delivered: MessageStatus.DELIVERED,
      read: MessageStatus.READ,
      failed: MessageStatus.FAILED,
    };

    return statusMap[metaStatus] || MessageStatus.PENDING;
  }

  private async getOrganizationSettings(organizationId: string): Promise<any> {
    const { Organization } = await import('@app/shared/entities/organization.entity');
    return this.contactRepository.manager.findOne(Organization, {
      where: { id: organizationId },
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Webhook job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Webhook job ${job.id} failed: ${error.message}`);
  }
}
