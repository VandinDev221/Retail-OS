import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FiscalService } from './fiscal.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { FiscalType } from '@prisma/client';

@ApiTags('Fiscal & NFC-e')
@ApiBearerAuth()
@Controller('fiscal')
@UseGuards(PermissionsGuard)
export class FiscalController {
  constructor(private fiscalService: FiscalService) {}

  @Get('status')
  @Permissions('fiscal:emit')
  @ApiOperation({ summary: 'Status de disponibilidade do serviço fiscal / SEFAZ' })
  async getStatus() {
    return this.fiscalService.getStatus();
  }

  @Get('documents')
  @Permissions('fiscal:emit')
  @ApiOperation({ summary: 'Listar documentos fiscais emitidos' })
  async getDocuments(@CurrentUser('tenantId') tenantId: string, @Query('storeId') storeId?: string) {
    return this.fiscalService.getDocuments(tenantId, storeId);
  }

  @Post('emit/:saleId')
  @Permissions('fiscal:emit')
  @ApiOperation({ summary: 'Emitir NFC-e / Cupom Fiscal da venda' })
  async emitFiscal(
    @CurrentUser('tenantId') tenantId: string,
    @Param('saleId') saleId: string,
    @Body('type') type?: FiscalType,
  ) {
    return this.fiscalService.emitFiscalDocument(tenantId, saleId, type);
  }

  @Post('cancel/:docId')
  @Permissions('fiscal:cancel')
  @ApiOperation({ summary: 'Cancelar documento fiscal emitido' })
  async cancelFiscal(
    @CurrentUser('tenantId') tenantId: string,
    @Param('docId') docId: string,
    @Body('reason') reason: string,
  ) {
    return this.fiscalService.cancelFiscalDocument(tenantId, docId, reason || 'Cancelamento solicitado pelo emitente');
  }
}
