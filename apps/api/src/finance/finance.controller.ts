import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService, CreatePayableDto, CreateReceivableDto } from './finance.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { FinancialStatus } from '@prisma/client';

@ApiTags('Financeiro Operacional')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(PermissionsGuard)
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('summary')
  @Permissions('finance:read')
  @ApiOperation({ summary: 'Resumo do fluxo financeiro do mês' })
  async getSummary(@CurrentUser('tenantId') tenantId: string, @Query('storeId') storeId?: string) {
    return this.financeService.getCashFlowSummary(tenantId, storeId);
  }

  @Get('payables')
  @Permissions('finance:payables')
  @ApiOperation({ summary: 'Listar contas a pagar' })
  async getPayables(
    @CurrentUser('tenantId') tenantId: string,
    @Query('storeId') storeId?: string,
    @Query('status') status?: FinancialStatus,
  ) {
    return this.financeService.getPayables(tenantId, storeId, status);
  }

  @Post('payables')
  @Permissions('finance:payables')
  @ApiOperation({ summary: 'Cadastrar conta a pagar' })
  async createPayable(@CurrentUser('tenantId') tenantId: string, @Body() body: CreatePayableDto) {
    return this.financeService.createPayable(tenantId, body);
  }

  @Put('payables/:id/pay')
  @Permissions('finance:payables')
  @ApiOperation({ summary: 'Marcar conta a pagar como paga' })
  async markPayableAsPaid(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.financeService.markPayableAsPaid(tenantId, id);
  }

  @Get('receivables')
  @Permissions('finance:receivables')
  @ApiOperation({ summary: 'Listar contas a receber (fiado / crediário)' })
  async getReceivables(
    @CurrentUser('tenantId') tenantId: string,
    @Query('storeId') storeId?: string,
    @Query('status') status?: FinancialStatus,
  ) {
    return this.financeService.getReceivables(tenantId, storeId, status);
  }

  @Post('receivables')
  @Permissions('finance:receivables')
  @ApiOperation({ summary: 'Cadastrar conta a receber' })
  async createReceivable(@CurrentUser('tenantId') tenantId: string, @Body() body: CreateReceivableDto) {
    return this.financeService.createReceivable(tenantId, body);
  }

  @Put('receivables/:id/receive')
  @Permissions('finance:receivables')
  @ApiOperation({ summary: 'Marcar conta a receber como recebida' })
  async markReceivableAsReceived(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.financeService.markReceivableAsReceived(tenantId, id);
  }
}
