import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WebhookQueueProducer } from '@app/queue';
import { Organization } from '@app/shared/entities/organization.entity';
import { IMetaWebhookPayload } from '@app/shared/interfaces';

@Injectable()
export class WebhookHandlerService {
  private readonly logger = new Logger(WebhookHandlerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly webhookQueueProducer: WebhookQueueProducer,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async processWebhook(
    payload: IMetaWebhookPayload,
    organizationId?: string,
  ): Promise<void> {
    this.logger.debug(`Processing webhook with ${payload.entry?.length || 0} entries`);

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const { value } = change;

        // Extract organization from phone_number_id if not provided
        const targetOrganizationId = organizationId || 
          await this.findOrganizationByPhoneNumberId(value.metadata?.phone_number_id);

        if (!targetOrganizationId) {
          this.logger.warn(`Organization not found for phone_number_id: ${value.metadata?.phone_number_id}`);
          continue;
        }

        // Queue the webhook for processing
        await this.webhookQueueProducer.processIncomingWebhook({
          webhookId: entry.id,
          organizationId: targetOrganizationId,
          eventType: change.field,
          payload: {
            object: payload.object,
            entry: [entry],
          },
        });

        this.logger.debug(`Webhook queued for organization: ${targetOrganizationId}`);
      }
    }
  }

  async getVerifyToken(organizationId: string): Promise<string> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      select: ['webhookVerifyToken'],
    });

    return organization?.webhookVerifyToken || 
           this.configService.get('META_WEBHOOK_VERIFY_TOKEN');
  }

  async getAppSecret(organizationId: string): Promise<string> {
    // In a real implementation, you might store app secrets per organization
    // For now, we return the global app secret
    return this.configService.get('META_APP_SECRET');
  }

  private async findOrganizationByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
    if (!phoneNumberId) return null;

    // Query the database to find organization by phone number ID
    const organization = await this.organizationRepository
      .createQueryBuilder('org')
      .innerJoin('org.whatsappAccounts', 'account')
      .where('account.phoneNumberId = :phoneNumberId', { phoneNumberId })
      .select('org.id')
      .getOne();

    return organization?.id || null;
  }

  /**
   * Process webhook synchronously (for testing/debugging)
   */
  async processWebhookSync(payload: IMetaWebhookPayload): Promise<any> {
    const results = [];

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const { value } = change;

        // Process messages
        if (value.messages) {
          for (const message of value.messages) {
            results.push({
              type: 'message',
              id: message.id,
              from: message.from,
              timestamp: message.timestamp,
              messageType: message.type,
            });
          }
        }

        // Process status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            results.push({
              type: 'status',
              id: status.id,
              status: status.status,
              timestamp: status.timestamp,
            });
          }
        }
      }
    }

    return results;
  }
}
