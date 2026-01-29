import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { WhatsAppAccount } from './whatsapp-account.entity';
import { Campaign } from './campaign.entity';
import { TemplateStatus, TemplateCategory } from '../enums';

@Entity('templates')
@Index(['metaTemplateId'], { unique: true, where: "meta_template_id IS NOT NULL" })
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  accountId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'meta_template_id' })
  metaTemplateId?: string;

  @Column({
    type: 'enum',
    enum: TemplateCategory,
  })
  category: TemplateCategory;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'jsonb' })
  components: {
    header?: {
      type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
      text?: string;
      example?: any;
    };
    body: {
      text: string;
      example?: {
        body_text?: string[][];
      };
    };
    footer?: {
      text: string;
    };
    buttons?: Array<{
      type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
      text: string;
      url?: string;
      phoneNumber?: string;
      example?: string[];
    }>;
  };

  @Column({ type: 'jsonb', default: [] })
  variables: Array<{
    name: string;
    type: 'text' | 'currency' | 'date_time' | 'image' | 'video' | 'document';
    example?: string;
    required?: boolean;
  }>;

  @Column({
    type: 'enum',
    enum: TemplateStatus,
    default: TemplateStatus.DRAFT,
  })
  status: TemplateStatus;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'submitted_at' })
  submittedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'approved_at' })
  approvedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, (organization) => organization.templates)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => WhatsAppAccount, (account) => account.templates)
  @JoinColumn({ name: 'account_id' })
  account: WhatsAppAccount;

  @OneToMany(() => Campaign, (campaign) => campaign.template)
  campaigns: Campaign[];
}
