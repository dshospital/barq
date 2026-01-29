import { IsString, IsEmail, IsOptional, IsEnum, IsUUID, IsNumber, IsBoolean, IsDate, IsArray, IsObject, MinLength, MaxLength, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, UserStatus, CampaignStatus, CampaignType, TemplateStatus, TemplateCategory, MessageStatus, MessageType, ConsentStatus } from '../enums';

// Pagination DTO
export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

// Auth DTOs
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

// User DTOs
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.AGENT;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus = UserStatus.ACTIVE;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}

// Organization DTOs
export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

// WhatsApp Account DTOs
export class CreateWhatsAppAccountDto {
  @IsString()
  phoneNumberId: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  displayName: string;

  @IsOptional()
  @IsString()
  metaWabaId?: string;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;
}

export class UpdateWhatsAppAccountDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;
}

// Template DTOs
export class CreateTemplateDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @IsString()
  language: string;

  @IsObject()
  components: {
    header?: any;
    body: any;
    footer?: any;
    buttons?: any[];
  };

  @IsOptional()
  @IsArray()
  variables?: any[];
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsObject()
  components?: any;

  @IsOptional()
  @IsArray()
  variables?: any[];
}

export class SubmitTemplateDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

// Campaign DTOs
export class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CampaignType)
  type: CampaignType;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsUUID()
  accountId: string;

  @IsOptional()
  @IsObject()
  audienceSegment?: {
    listIds?: string[];
    contactIds?: string[];
    filters?: any;
  };

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledAt?: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsObject()
  audienceSegment?: any;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledAt?: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class LaunchCampaignDto {
  @IsOptional()
  @IsBoolean()
  immediate?: boolean = false;
}

// Contact DTOs
export class CreateContactDto {
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(ConsentStatus)
  consentStatus?: ConsentStatus;
}

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(ConsentStatus)
  consentStatus?: ConsentStatus;
}

export class BulkImportContactsDto {
  @IsArray()
  contacts: CreateContactDto[];
}

// Message DTOs
export class SendMessageDto {
  @IsUUID()
  contactId: string;

  @IsEnum(MessageType)
  messageType: MessageType;

  @IsObject()
  content: any;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsArray()
  templateParams?: any[];

  @IsOptional()
  @IsBoolean()
  useAI?: boolean;
}

export class SendBulkMessagesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  contactIds: string[];

  @IsEnum(MessageType)
  messageType: MessageType;

  @IsObject()
  content: any;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsArray()
  templateParams?: any[];
}

// Webhook DTOs
export class CreateWebhookDto {
  @IsString()
  name: string;

  @IsString()
  url: string;

  @IsArray()
  @IsString({ each: true })
  events: string[];

  @IsOptional()
  @IsString()
  secret?: string;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsArray()
  events?: string[];

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

// AI DTOs
export class AIAnalyzeMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsString()
  language?: string;
}

export class AIGenerateReplyDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  context?: {
    conversationHistory?: any[];
    contactInfo?: any;
    organizationContext?: any;
  };

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  numSuggestions?: number;
}

// Dashboard DTOs
export class DashboardStatsQueryDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsUUID()
  accountId?: string;
}

// File Upload DTO
export class FileUploadDto {
  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
