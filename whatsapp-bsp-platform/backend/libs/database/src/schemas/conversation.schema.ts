import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ConversationStatus, Priority, Sentiment } from '@app/shared';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  contactId: string;

  @Prop({ type: String, required: true })
  accountId: string;

  @Prop({ type: String })
  waConversationId?: string;

  // Denormalized contact info for quick access
  @Prop({ type: Object })
  contact?: {
    phoneNumber: string;
    name: string;
    profilePicture?: string;
  };

  @Prop({
    type: String,
    enum: Object.values(ConversationStatus),
    default: ConversationStatus.ACTIVE,
    index: true,
  })
  status: ConversationStatus;

  @Prop({
    type: String,
    enum: Object.values(Priority),
    default: Priority.MEDIUM,
  })
  priority: Priority;

  @Prop({ type: String, index: true })
  assignedTo?: string;

  @Prop({ type: Date })
  assignedAt?: Date;

  // AI Analysis
  @Prop({ type: Object })
  aiAnalysis?: {
    sentiment?: Sentiment;
    sentimentScore?: number;
    intent?: string;
    language?: string;
    summary?: string;
  };

  @Prop({ type: Date, index: true })
  lastMessageAt: Date;

  @Prop({ type: String })
  lastMessagePreview?: string;

  @Prop({ type: Object })
  messageCount: {
    incoming: number;
    outgoing: number;
  };

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: String, default: 'whatsapp' })
  source: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;

  // TTL for archiving
  @Prop({ type: Date, index: { expireAfterSeconds: 0 } })
  expiresAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes
ConversationSchema.index({ organizationId: 1, lastMessageAt: -1 });
ConversationSchema.index({ organizationId: 1, assignedTo: 1, status: 1 });
ConversationSchema.index({ contactId: 1 });
ConversationSchema.index({ waConversationId: 1 });
ConversationSchema.index({ organizationId: 1, status: 1, priority: 1 });
ConversationSchema.index({ assignedTo: 1, status: 1 });
ConversationSchema.index({ 'aiAnalysis.sentiment': 1 });
ConversationSchema.index({ tags: 1 });
