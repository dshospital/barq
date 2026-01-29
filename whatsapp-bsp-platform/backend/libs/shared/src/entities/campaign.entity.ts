import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Template } from './template.entity';
import { WhatsAppAccount } from './whatsapp-account.entity';
import { CampaignStatus, CampaignType } from '../enums';

@Entity('campaigns')
@Index(['organizationId', 'status'])
@Index(['scheduledAt'])
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  templateId?: string;

  @Column({ type: 'uuid' })
  accountId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: CampaignType,
    default: CampaignType.BROADCAST,
  })
  type: CampaignType;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({ type: 'jsonb', default: {} })
  audienceSegment: {
    listIds?: string[];
    contactIds?: string[];
    filters?: {
      tags?: string[];
      consentStatus?: string;
      lastInteractionBefore?: Date;
      lastInteractionAfter?: Date;
    };
  };

  @Column({ type: 'int', default: 0, name: 'total_recipients' })
  totalRecipients: number;

  @Column({ type: 'int', default: 0, name: 'sent_count' })
  sentCount: number;

  @Column({ type: 'int', default: 0, name: 'delivered_count' })
  deliveredCount: number;

  @Column({ type: 'int', default: 0, name: 'read_count' })
  readCount: number;

  @Column({ type: 'int', default: 0, name: 'failed_count' })
  failedCount: number;

  @Column({ type: 'timestamp', nullable: true, name: 'scheduled_at' })
  scheduledAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt?: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    templateParams?: Record<string, any>;
    sendTimeOptimization?: boolean;
    throttleRate?: number;
    errorDetails?: any[];
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, (organization) => organization.campaigns)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Template, (template) => template.campaigns)
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @ManyToOne(() => WhatsAppAccount, (account) => account.campaigns)
  @JoinColumn({ name: 'account_id' })
  account: WhatsAppAccount;

  // Virtual columns for stats
  get deliveryRate(): number {
    if (this.sentCount === 0) return 0;
    return Math.round((this.deliveredCount / this.sentCount) * 100);
  }

  get readRate(): number {
    if (this.deliveredCount === 0) return 0;
    return Math.round((this.readCount / this.deliveredCount) * 100);
  }

  get progress(): number {
    if (this.totalRecipients === 0) return 0;
    return Math.round(((this.sentCount + this.failedCount) / this.totalRecipients) * 100);
  }
}
