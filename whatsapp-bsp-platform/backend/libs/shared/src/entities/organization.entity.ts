import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { WhatsAppAccount } from './whatsapp-account.entity';
import { Template } from './template.entity';
import { Campaign } from './campaign.entity';
import { Contact } from './contact.entity';
import { OrganizationStatus } from '../enums';

@Entity('organizations')
@Index(['slug'], { unique: true })
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  metaBusinessId?: string;

  @Column({ type: 'text', nullable: true })
  metaAccessToken?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  webhookVerifyToken?: string;

  @Column({
    type: 'enum',
    enum: OrganizationStatus,
    default: OrganizationStatus.ACTIVE,
  })
  status: OrganizationStatus;

  @Column({ type: 'jsonb', default: {} })
  settings: {
    timezone?: string;
    language?: string;
    currency?: string;
    aiEnabled?: boolean;
    autoReplyEnabled?: boolean;
    webhookUrl?: string;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => WhatsAppAccount, (account) => account.organization)
  whatsappAccounts: WhatsAppAccount[];

  @OneToMany(() => Template, (template) => template.organization)
  templates: Template[];

  @OneToMany(() => Campaign, (campaign) => campaign.organization)
  campaigns: Campaign[];

  @OneToMany(() => Contact, (contact) => contact.organization)
  contacts: Contact[];
}
