import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppAccount } from '@app/shared/entities/whatsapp-account.entity';

export interface SendMessageResponse {
  success: boolean;
  waMessageId?: string;
  error?: string;
  errorCode?: string;
}

@Injectable()
export class MetaClientService {
  private readonly logger = new Logger(MetaClientService.name);
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(WhatsAppAccount)
    private readonly accountRepository: Repository<WhatsAppAccount>,
  ) {}

  private async getAccessToken(accountId: string): Promise<string> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error(`WhatsApp account not found: ${accountId}`);
    }

    // Check if token is expired and refresh if needed
    if (account.credentials?.tokenExpiresAt && 
        new Date(account.credentials.tokenExpiresAt) < new Date()) {
      // TODO: Implement token refresh logic
      this.logger.warn(`Token may be expired for account: ${accountId}`);
    }

    return account.credentials?.accessToken || 
           this.configService.get('META_ACCESS_TOKEN');
  }

  async sendTextMessage(
    accountId: string,
    to: string,
    text: string,
    previewUrl: boolean = false,
  ): Promise<SendMessageResponse> {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      const accessToken = await this.getAccessToken(accountId);
      const url = `${this.baseUrl}/${account.phoneNumberId}/messages`;

      const response = await lastValueFrom(
        this.httpService.post(
          url,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: {
              body: text,
              preview_url: previewUrl,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        success: true,
        waMessageId: response.data.messages?.[0]?.id,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async sendTemplateMessage(
    accountId: string,
    to: string,
    templateName: string,
    parameters: any[] = [],
    languageCode: string = 'en',
  ): Promise<SendMessageResponse> {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      const accessToken = await this.getAccessToken(accountId);
      const url = `${this.baseUrl}/${account.phoneNumberId}/messages`;

      const templatePayload: any = {
        name: templateName,
        language: {
          code: languageCode,
        },
      };

      if (parameters && parameters.length > 0) {
        templatePayload.components = [
          {
            type: 'body',
            parameters: parameters.map((param) => ({
              type: param.type || 'text',
              text: param.text || param.value,
            })),
          },
        ];
      }

      const response = await lastValueFrom(
        this.httpService.post(
          url,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'template',
            template: templatePayload,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        success: true,
        waMessageId: response.data.messages?.[0]?.id,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async sendMediaMessage(
    accountId: string,
    to: string,
    mediaType: 'image' | 'video' | 'audio',
    mediaUrl: string,
    caption?: string,
  ): Promise<SendMessageResponse> {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      const accessToken = await this.getAccessToken(accountId);
      const url = `${this.baseUrl}/${account.phoneNumberId}/messages`;

      const mediaPayload: any = {
        link: mediaUrl,
      };

      if (caption && mediaType !== 'audio') {
        mediaPayload.caption = caption;
      }

      const response = await lastValueFrom(
        this.httpService.post(
          url,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: mediaType,
            [mediaType]: mediaPayload,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        success: true,
        waMessageId: response.data.messages?.[0]?.id,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async sendDocumentMessage(
    accountId: string,
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string,
  ): Promise<SendMessageResponse> {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      const accessToken = await this.getAccessToken(accountId);
      const url = `${this.baseUrl}/${account.phoneNumberId}/messages`;

      const documentPayload: any = {
        link: documentUrl,
        filename,
      };

      if (caption) {
        documentPayload.caption = caption;
      }

      const response = await lastValueFrom(
        this.httpService.post(
          url,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'document',
            document: documentPayload,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        success: true,
        waMessageId: response.data.messages?.[0]?.id,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async sendLocationMessage(
    accountId: string,
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
  ): Promise<SendMessageResponse> {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      const accessToken = await this.getAccessToken(accountId);
      const url = `${this.baseUrl}/${account.phoneNumberId}/messages`;

      const locationPayload: any = {
        latitude,
        longitude,
      };

      if (name) locationPayload.name = name;
      if (address) locationPayload.address = address;

      const response = await lastValueFrom(
        this.httpService.post(
          url,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'location',
            location: locationPayload,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        success: true,
        waMessageId: response.data.messages?.[0]?.id,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async sendInteractiveMessage(
    accountId: string,
    to: string,
    interactive: any,
  ): Promise<SendMessageResponse> {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      const accessToken = await this.getAccessToken(accountId);
      const url = `${this.baseUrl}/${account.phoneNumberId}/messages`;

      const response = await lastValueFrom(
        this.httpService.post(
          url,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'interactive',
            interactive,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        success: true,
        waMessageId: response.data.messages?.[0]?.id,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMediaUrl(accountId: string, mediaId: string): Promise<string> {
    try {
      const accessToken = await this.getAccessToken(accountId);
      const url = `${this.baseUrl}/${mediaId}`;

      const response = await lastValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return response.data.url;
    } catch (error) {
      this.logger.error(`Failed to get media URL: ${error.message}`);
      throw error;
    }
  }

  async downloadMedia(mediaUrl: string, accountId: string): Promise<Buffer> {
    try {
      const accessToken = await this.getAccessToken(accountId);

      const response = await lastValueFrom(
        this.httpService.get(mediaUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          responseType: 'arraybuffer',
        }),
      );

      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to download media: ${error.message}`);
      throw error;
    }
  }

  async getBusinessProfile(accountId: string): Promise<any> {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      const accessToken = await this.getAccessToken(accountId);
      const url = `${this.baseUrl}/${account.phoneNumberId}/whatsapp_business_profile`;

      const response = await lastValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            fields: 'about,address,description,email,profile_picture_url,websites,vertical',
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get business profile: ${error.message}`);
      throw error;
    }
  }

  async getPhoneNumbers(wabaId: string, accessToken: string): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/${wabaId}/phone_numbers`;

      const response = await lastValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return response.data.data || [];
    } catch (error) {
      this.logger.error(`Failed to get phone numbers: ${error.message}`);
      throw error;
    }
  }

  async registerPhoneNumber(phoneNumberId: string, accessToken: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/${phoneNumberId}/register`;

      await lastValueFrom(
        this.httpService.post(
          url,
          {
            messaging_product: 'whatsapp',
            pin: '000000', // TODO: Generate proper PIN
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    } catch (error) {
      this.logger.error(`Failed to register phone number: ${error.message}`);
      throw error;
    }
  }

  async deregisterPhoneNumber(phoneNumberId: string, accessToken: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/${phoneNumberId}/deregister`;

      await lastValueFrom(
        this.httpService.post(
          url,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    } catch (error) {
      this.logger.error(`Failed to deregister phone number: ${error.message}`);
      throw error;
    }
  }

  async getMessageTemplates(wabaId: string, accessToken: string): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/${wabaId}/message_templates`;

      const response = await lastValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return response.data.data || [];
    } catch (error) {
      this.logger.error(`Failed to get message templates: ${error.message}`);
      throw error;
    }
  }

  async createMessageTemplate(
    wabaId: string,
    accessToken: string,
    template: any,
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}/${wabaId}/message_templates`;

      const response = await lastValueFrom(
        this.httpService.post(url, template, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create message template: ${error.message}`);
      throw error;
    }
  }

  async deleteMessageTemplate(
    wabaId: string,
    accessToken: string,
    templateName: string,
  ): Promise<void> {
    try {
      const url = `${this.baseUrl}/${wabaId}/message_templates`;

      await lastValueFrom(
        this.httpService.delete(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            name: templateName,
          },
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete message template: ${error.message}`);
      throw error;
    }
  }

  private handleError(error: any): SendMessageResponse {
    if (error instanceof AxiosError) {
      const axiosError = error as AxiosError<any>;
      const errorData = axiosError.response?.data?.error;

      this.logger.error(
        `Meta API Error: ${errorData?.message || axiosError.message}`,
        axiosError.response?.data,
      );

      return {
        success: false,
        error: errorData?.message || axiosError.message,
        errorCode: errorData?.code?.toString() || axiosError.code,
      };
    }

    this.logger.error(`Unexpected error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}
