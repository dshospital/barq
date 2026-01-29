import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { 
  Organization, 
  User, 
  WhatsAppAccount, 
  Template, 
  Campaign, 
  Contact 
} from '@app/shared/entities';
import { Message, MessageSchema } from './schemas/message.schema';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';

const entities = [
  Organization,
  User,
  WhatsAppAccount,
  Template,
  Campaign,
  Contact,
];

@Global()
@Module({
  imports: [
    // PostgreSQL (TypeORM)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST', 'localhost'),
        port: configService.get('POSTGRES_PORT', 5432),
        username: configService.get('POSTGRES_USER', 'postgres'),
        password: configService.get('POSTGRES_PASSWORD', 'password'),
        database: configService.get('POSTGRES_DB', 'whatsapp_bsp'),
        entities,
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('POSTGRES_LOGGING', 'false') === 'true',
        ssl: configService.get('POSTGRES_SSL') === 'true' ? {
          rejectUnauthorized: false,
        } : false,
        poolSize: 20,
        extra: {
          max: 20,
          connectionTimeoutMillis: 5000,
          query_timeout: 10000,
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature(entities),

    // MongoDB (Mongoose)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get(
          'MONGODB_URI',
          'mongodb://localhost:27017/whatsapp_bsp_messages',
        ),
        maxPoolSize: 50,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
  ],
  exports: [
    TypeOrmModule,
    MongooseModule,
  ],
})
export class DatabaseModule {}
