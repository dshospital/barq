import { MessageStatus, MessageType, Sentiment } from '../enums';

export interface IJwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface IAuthenticatedUser {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
}

export interface IPaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface IPaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  error?: IApiError;
  meta?: Record<string, any>;
}

export interface IApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface IMetaWebhookPayload {
  object: string;
  entry: IMetaWebhookEntry[];
}

export interface IMetaWebhookEntry {
  id: string;
  changes: IMetaWebhookChange[];
}

export interface IMetaWebhookChange {
  value: IMetaWebhookValue;
  field: string;
}

export interface IMetaWebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: IMetaContact[];
  messages?: IMetaMessage[];
  statuses?: IMetaStatus[];
  errors?: IMetaError[];
}

export interface IMetaContact {
  wa_id: string;
  profile: {
    name: string;
  };
}

export interface IMetaMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  image?: IMetaMedia;
  video?: IMetaMedia;
  audio?: IMetaMedia;
  document?: IMetaMedia & {
    filename: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  interactive?: {
    type: string;
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  context?: {
    from: string;
    id: string;
  };
}

export interface IMetaMedia {
  id: string;
  mime_type: string;
  caption?: string;
  sha256?: string;
}

export interface IMetaStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin: {
      type: string;
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: IMetaError[];
}

export interface IMetaError {
  code: number;
  title: string;
  message?: string;
  error_data?: {
    details: string;
  };
}

export interface IMessageQueueData {
  messageId: string;
  organizationId: string;
  campaignId?: string;
  contactId: string;
  phoneNumber: string;
  messageType: MessageType;
  content: any;
  templateId?: string;
  templateParams?: any[];
  accountId: string;
  retryCount?: number;
  priority?: number;
}

export interface IWebhookQueueData {
  webhookId: string;
  organizationId: string;
  eventType: string;
  payload: any;
  retryCount?: number;
}

export interface IAIAnalysisResult {
  sentiment: Sentiment;
  sentimentScore: number;
  intent: string;
  language: string;
  summary?: string;
  suggestedReplies?: string[];
  entities?: Array<{
    type: string;
    value: string;
    start: number;
    end: number;
  }>;
}

export interface ITemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  parameters?: ITemplateParameter[];
  text?: string;
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  example?: any;
  buttons?: ITemplateButton[];
}

export interface ITemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'video' | 'document';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
}

export interface ITemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
  text: string;
  url?: string;
  phone_number?: string;
  example?: string[];
}

export interface ICampaignStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
  deliveryRate: number;
  readRate: number;
  estimatedCompletion?: Date;
}

export interface IRateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

export interface IOrganizationContext {
  organizationId: string;
  permissions: string[];
}

export interface IFileUploadResult {
  url: string;
  key: string;
  mimeType: string;
  size: number;
  originalName: string;
}

export interface IAuditLog {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  organizationId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}
