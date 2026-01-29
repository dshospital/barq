import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MetaClientService } from './meta-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  providers: [MetaClientService],
  exports: [MetaClientService],
})
export class MetaClientModule {}
