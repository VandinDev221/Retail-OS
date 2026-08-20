import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LockService } from './lock.service';
import { RateLimitService } from './rate-limit.service';
import { CloudStorageProvider, StorageProvider } from './storage.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    LockService,
    RateLimitService,
    {
      provide: StorageProvider,
      useClass: CloudStorageProvider,
    },
  ],
  exports: [LockService, RateLimitService, StorageProvider],
})
export class InfrastructureModule {}
