import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { WebhookHandlerModule } from './webhook-handler.module';

async function bootstrap() {
  const logger = new Logger('WebhookHandler');

  const app = await NestFactory.create(WebhookHandlerModule);

  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet());

  // Trust proxy (important for getting real client IP)
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  // Global prefix
  app.setGlobalPrefix('webhooks');

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get('WEBHOOK_PORT', 3001);
  const host = configService.get('WEBHOOK_HOST', '0.0.0.0');

  await app.listen(port, host);

  logger.log(`Webhook handler is running on: http://${host}:${port}/webhooks`);
}

bootstrap();
