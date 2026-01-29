export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  AGENT = 'agent',
  VIEWER = 'viewer',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum OrganizationStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum CampaignType {
  BROADCAST = 'broadcast',
  SCHEDULED = 'scheduled',
  TRIGGERED = 'triggered',
}

export enum TemplateStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAUSED = 'paused',
}

export enum TemplateCategory {
  MARKETING = 'MARKETING',
  UTILITY = 'UTILITY',
  AUTHENTICATION = 'AUTHENTICATION',
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  TEMPLATE = 'template',
  INTERACTIVE = 'interactive',
  CONTACTS = 'contacts',
  STICKER = 'sticker',
  REACTION = 'reaction',
}

export enum WhatsAppAccountStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  PENDING = 'PENDING',
}

export enum QualityRating {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
}

export enum ConsentStatus {
  OPTED_IN = 'opted_in',
  OPTED_OUT = 'opted_out',
  PENDING = 'pending',
}

export enum BillingTransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  REFUND = 'refund',
}

export enum BillingTransactionCategory {
  MESSAGE = 'message',
  SUBSCRIPTION = 'subscription',
  TOPUP = 'topup',
  REFUND = 'refund',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum Sentiment {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
}

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  SPAM = 'spam',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum ApiKeyPermission {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
}

export enum MetaWebhookType {
  MESSAGES = 'messages',
  STATUSES = 'statuses',
  TEMPLATE_STATUS_UPDATE = 'template_status_update',
  PHONE_NUMBER_NAME_UPDATE = 'phone_number_name_update',
  PHONE_NUMBER_QUALITY_UPDATE = 'phone_number_quality_update',
  ACCOUNT_UPDATE = 'account_update',
  SECURITY = 'security',
  BUSINESS_CAPABILITY_UPDATE = 'business_capability_update',
}

export enum MetaMessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum ButtonType {
  QUICK_REPLY = 'quick_reply',
  URL = 'url',
  PHONE_NUMBER = 'phone_number',
  COPY_CODE = 'copy_code',
}

export enum HeaderType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}
