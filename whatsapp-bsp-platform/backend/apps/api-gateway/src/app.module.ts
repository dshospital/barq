import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@app/database';
import { QueueModule } from '@app/queue';
import { MetaClientModule } from '@app/meta-client';
import { AiClientModule } from '@app/ai-client';

// Feature Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ContactsModule } from './contacts/contacts.module';
import { MessagesModule } from './messages/messages.module';
import { TemplatesModule } from './templates/templates.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WhatsAppAccountsModule } from './whatsapp-accounts/whatsapp-accounts.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 3600000,
        limit: 1000,
      },
    ]),

    // Database & Queue
    DatabaseModule,
    QueueModule,

    // External Services
    MetaClientModule,
    AiClientModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    CampaignsModule,
    ContactsModule,
    MessagesModule,
    TemplatesModule,
    DashboardModule,
    WebhooksModule,
    WhatsAppAccountsModule,
  ],
})
export class AppModule {}
