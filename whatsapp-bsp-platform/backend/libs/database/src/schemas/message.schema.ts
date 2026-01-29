import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MessageStatus, MessageType, MessageDirection } from '@app/shared';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  contactId: string;

  @Prop({ type: String, index: true })
  campaignId?: string;

  @Prop({
    type: String,
    enum: Object.values(MessageDirection),
    required: true,
  })
  direction: MessageDirection;

  @Prop({
    type: String,
    enum: Object.values(MessageType),
    required: true,
  })
  messageType: MessageType;

  @Prop({ type: String })
  waMessageId?: string;

  @Prop({ type: String })
  waConversationId?: string;

  @Prop({ type: Object })
  content: {
    text?: string;
    mediaUrl?: string;
    mediaMimeType?: string;
    mediaSize?: number;
    mediaCaption?: string;
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    };
    document?: {
      filename: string;
      url: string;
      mimeType: string;
    };
  };

  @Prop({ type: Object })
  template?: {
    id: string;
    name: string;
    language: string;
    parameters: any[];
  };

  @Prop({ type: Object })
  interactive?: {
    type: string;
    buttonReply?: {
      id: string;
      title: string;
    };
    listReply?: {
      id: string;
      title: string;
      description?: string;
    };
  };

  @Prop({
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.PENDING,
    index: true,
  })
  status: MessageStatus;

  @Prop({ type: [{ type: Object }] })
  statusHistory: Array<{
    status: MessageStatus;
    timestamp: Date;
    errorCode?: string;
    errorMessage?: string;
  }>;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: Date })
  failedAt?: Date;

  @Prop({ type: Object })
  aiProcessing?: {
    processed: boolean;
    sentiment?: string;
    intent?: string;
    suggestedReplies?: string[];
    autoReplied?: boolean;
    autoReplyContent?: string;
  };

  @Prop({ type: Object })
  sentBy?: {
    userId?: string;
    userName?: string;
    isAutomated: boolean;
  };

  @Prop({ type: Object })
  cost?: {
    amount: number;
    currency: string;
    category: string;
  };

  @Prop({ type: Object })
  rawWebhook?: any;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes
MessageSchema.index({ organizationId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ waMessageId: 1 });
MessageSchema.index({ contactId: 1, createdAt: -1 });
MessageSchema.index({ campaignId: 1 });
MessageSchema.index({ status: 1, createdAt: 1 });
MessageSchema.index({ 'aiProcessing.processed': 1 });
MessageSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
