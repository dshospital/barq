import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiClientService } from './ai-client.service';

@Module({
  imports: [ConfigModule],
  providers: [AiClientService],
  exports: [AiClientService],
})
export class AiClientModule {}
