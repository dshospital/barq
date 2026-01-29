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
import { ConsentStatus } from '../enums';

@Entity('contacts')
@Index(['organizationId', 'phoneNumber'], { unique: true })
@Index(['organizationId', 'lastInteraction'])
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 20, name: 'phone_number' })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'first_name' })
  firstName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'last_name' })
  lastName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'jsonb', default: {} })
  customFields: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({
    type: 'enum',
    enum: ConsentStatus,
    default: ConsentStatus.PENDING,
    name: 'consent_status',
  })
  consentStatus: ConsentStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'consent_updated_at' })
  consentUpdatedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_interaction' })
  lastInteraction?: Date;

  @Column({ type: 'int', default: 0, name: 'total_messages_received' })
  totalMessagesReceived: number;

  @Column({ type: 'int', default: 0, name: 'total_messages_sent' })
  totalMessagesSent: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, (organization) => organization.contacts)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // Virtual column for full name
  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || this.phoneNumber;
  }

  // Virtual column for initials
  get initials(): string {
    const first = this.firstName?.[0] || '';
    const last = this.lastName?.[0] || '';
    return (first + last).toUpperCase();
  }
}
