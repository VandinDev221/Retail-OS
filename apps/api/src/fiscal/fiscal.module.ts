import { Module } from '@nestjs/common';
import { FiscalService } from './fiscal.service';
import { FiscalController } from './fiscal.controller';
import { FiscalProvider } from './fiscal.provider';
import { MockFiscalProvider } from './mock-fiscal.provider';

@Module({
  controllers: [FiscalController],
  providers: [
    FiscalService,
    {
      provide: FiscalProvider,
      useClass: MockFiscalProvider,
    },
  ],
  exports: [FiscalService, FiscalProvider],
})
export class FiscalModule {}
