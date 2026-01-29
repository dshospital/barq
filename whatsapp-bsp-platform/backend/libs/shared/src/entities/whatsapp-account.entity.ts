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
import { Template } from './template.entity';
import { Campaign } from './campaign.entity';
import { WhatsAppAccountStatus, QualityRating } from '../enums';

@Entity('whatsapp_accounts')
@Index(['phoneNumberId'], { unique: true })
export class WhatsAppAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'phone_number_id' })
  phoneNumberId: string;

  @Column({ type: 'varchar', length: 20, name: 'phone_number' })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255, name: 'display_name' })
  displayName: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'meta_waba_id' })
  metaWabaId?: string;

  @Column({
    type: 'enum',
    enum: QualityRating,
    default: QualityRating.GREEN,
    name: 'quality_rating',
  })
  qualityRating: QualityRating;

  @Column({ type: 'int', default: 1000, name: 'messaging_limit' })
  messagingLimit: number;

  @Column({ type: 'int', default: 0, name: 'daily_sent_count' })
  dailySentCount: number;

  @Column({ type: 'timestamp', nullable: true, name: 'limit_reset_date' })
  limitResetDate?: Date;

  @Column({
    type: 'enum',
    enum: WhatsAppAccountStatus,
    default: WhatsAppAccountStatus.PENDING,
  })
  status: WhatsAppAccountStatus;

  @Column({ type: 'jsonb', default: {} })
  credentials: {
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, (organization) => organization.whatsappAccounts)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => Template, (template) => template.account)
  templates: Template[];

  @OneToMany(() => Campaign, (campaign) => campaign.account)
  campaigns: Campaign[];
}
