import { Controller, Get, Post, Body, Headers, Query, Logger, BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { WebhookHandlerService } from './webhook-handler.service';
import { IMetaWebhookPayload } from '@app/shared/interfaces';

@Controller('webhooks')
export class WebhookHandlerController {
  private readonly logger = new Logger(WebhookHandlerController.name);

  constructor(
    private readonly webhookHandlerService: WebhookHandlerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /webhooks/meta
   * Verification endpoint for Meta webhook subscription
   */
  @Get('meta')
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Query('organization_id') organizationId?: string,
  ): Promise<string> {
    this.logger.debug(`Webhook verification request - mode: ${mode}`);

    if (mode !== 'subscribe') {
      throw new BadRequestException('Invalid mode');
    }

    // Verify the token
    const expectedToken = organizationId 
      ? await this.webhookHandlerService.getVerifyToken(organizationId)
      : this.configService.get('META_WEBHOOK_VERIFY_TOKEN');

    if (verifyToken !== expectedToken) {
      this.logger.warn('Webhook verification failed: Invalid verify token');
      throw new BadRequestException('Verification failed');
    }

    this.logger.log('Webhook verified successfully');
    return challenge;
  }

  /**
   * POST /webhooks/meta
   * Main webhook endpoint for receiving events from Meta
   */
  @Post('meta')
  async receiveWebhook(
    @Body() payload: IMetaWebhookPayload,
    @Headers('x-hub-signature-256') signature: string,
    @Query('organization_id') organizationId?: string,
  ): Promise<{ success: boolean }> {
    this.logger.debug('Received webhook from Meta');

    // Verify signature if provided
    if (signature) {
      const isValid = await this.verifySignature(payload, signature, organizationId);
      if (!isValid) {
        this.logger.warn('Invalid webhook signature');
        throw new BadRequestException('Invalid signature');
      }
    }

    // Process the webhook
    try {
      await this.webhookHandlerService.processWebhook(payload, organizationId);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process webhook: ${error.message}`);
      // Still return 200 to prevent Meta from retrying
      return { success: false };
    }
  }

  /**
   * POST /webhooks/meta/:organizationId
   * Organization-specific webhook endpoint
   */
  @Post('meta/:organizationId')
  async receiveOrganizationWebhook(
    @Body() payload: IMetaWebhookPayload,
    @Headers('x-hub-signature-256') signature: string,
    @Query('organization_id') organizationId: string,
  ): Promise<{ success: boolean }> {
    return this.receiveWebhook(payload, signature, organizationId);
  }

  /**
   * GET /webhooks/health
   * Health check endpoint
   */
  @Get('health')
  healthCheck(): { status: string; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  private async verifySignature(
    payload: any,
    signature: string,
    organizationId?: string,
  ): Promise<boolean> {
    try {
      const appSecret = organizationId
        ? await this.webhookHandlerService.getAppSecret(organizationId)
        : this.configService.get('META_APP_SECRET');

      if (!appSecret) {
        this.logger.warn('No app secret configured, skipping signature verification');
        return true;
      }

      const expectedSignature = createHmac('sha256', appSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return signature === `sha256=${expectedSignature}`;
    } catch (error) {
      this.logger.error(`Signature verification error: ${error.message}`);
      return false;
    }
  }
}
