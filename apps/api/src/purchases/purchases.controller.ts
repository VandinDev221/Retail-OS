import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PurchasesService, CreatePurchaseOrderDto, ReceiveGoodsDto } from './purchases.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Compras & Fornecedores')
@ApiBearerAuth()
@Controller('purchases')
@UseGuards(PermissionsGuard)
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Get('orders')
  @Permissions('purchases:read')
  @ApiOperation({ summary: 'Listar pedidos de compra' })
  async findAllOrders(@CurrentUser('tenantId') tenantId: string, @Query('storeId') storeId?: string) {
    return this.purchasesService.findAllOrders(tenantId, storeId);
  }

  @Post('orders')
  @Permissions('purchases:create')
  @ApiOperation({ summary: 'Criar pedido de compra' })
  async createOrder(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: CreatePurchaseOrderDto,
  ) {
    return this.purchasesService.createOrder(tenantId, userId, body);
  }

  @Post('receive')
  @Permissions('purchases:receive')
  @ApiOperation({ summary: 'Recebimento de mercadorias com entrada no estoque, lotes e contas a pagar' })
  async receiveGoods(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: ReceiveGoodsDto,
  ) {
    return this.purchasesService.receiveGoods(tenantId, userId, body);
  }
}
