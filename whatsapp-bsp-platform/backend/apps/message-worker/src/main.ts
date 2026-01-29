import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageWorkerModule } from './message-worker.module';

async function bootstrap() {
  const logger = new Logger('MessageWorker');

  const app = await NestFactory.createApplicationContext(MessageWorkerModule);

  const configService = app.get(ConfigService);

  logger.log('Message Worker started');
  logger.log(`Environment: ${configService.get('NODE_ENV', 'development')}`);

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, closing application...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, closing application...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
