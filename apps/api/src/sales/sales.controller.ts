import { Controller, Get, Post, Body, Param, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { SalesService, CheckoutDto } from './sales.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SaleStatus } from '@prisma/client';

@ApiTags('Vendas & Frente de Caixa (PDV)')
@ApiBearerAuth()
@Controller('sales')
@UseGuards(PermissionsGuard)
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  @Permissions('sales:read')
  @ApiOperation({ summary: 'Listar vendas com paginação e filtros' })
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('storeId') storeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: SaleStatus,
  ) {
    return this.salesService.findAll(tenantId, {
      storeId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      status,
    });
  }

  @Get(':id')
  @Permissions('sales:read')
  @ApiOperation({ summary: 'Obter detalhes da venda com itens e pagamentos' })
  async findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.salesService.findById(tenantId, id);
  }

  @Post('checkout')
  @Permissions('sales:create')
  @ApiOperation({ summary: 'Finalizar venda transacional com baixa de estoque, caixa e FEFO' })
  @ApiHeader({ name: 'idempotency-key', required: false, description: 'Chave de idempotência para evitar venda duplicada' })
  async checkout(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: CheckoutDto,
  ) {
    return this.salesService.checkout(tenantId, userId, {
      ...body,
      idempotencyKey: idempotencyKey || body.idempotencyKey,
    });
  }

  @Post(':id/cancel')
  @Permissions('sales:cancel')
  @ApiOperation({ summary: 'Cancelar venda e estornar estoque e caixa' })
  async cancelSale(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') saleId: string,
    @Body('reason') reason: string,
  ) {
    return this.salesService.cancelSale(tenantId, saleId, userId, reason || 'Cancelamento solicitado pelo operador');
  }
}
