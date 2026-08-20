import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService, CreateStockMovementDto } from './inventory.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Estoque & Lotes & Inventário')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(PermissionsGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('balances')
  @Permissions('stock:read')
  @ApiOperation({ summary: 'Obter saldos de estoque por loja' })
  async getBalances(
    @CurrentUser('tenantId') tenantId: string,
    @Query('storeId') storeId: string,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.getBalances(tenantId, storeId, search);
  }

  @Get('movements')
  @Permissions('stock:read')
  @ApiOperation({ summary: 'Listar histórico de movimentações com paginação' })
  async getMovements(
    @CurrentUser('tenantId') tenantId: string,
    @Query('storeId') storeId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('productId') productId?: string,
  ) {
    return this.inventoryService.getMovements(
      tenantId,
      storeId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      productId,
    );
  }

  @Get('lots')
  @Permissions('stock:lots')
  @ApiOperation({ summary: 'Listar lotes de estoque ordenados por vencimento (FEFO)' })
  async getLots(
    @CurrentUser('tenantId') tenantId: string,
    @Query('storeId') storeId: string,
    @Query('productId') productId?: string,
  ) {
    return this.inventoryService.getLots(tenantId, storeId, productId);
  }

  @Get('expiry-alerts')
  @Permissions('stock:lots')
  @ApiOperation({ summary: 'Obter alertas de produtos vencidos ou a vencer (3, 7, 15, 30 dias)' })
  async getExpiryAlerts(
    @CurrentUser('tenantId') tenantId: string,
    @Query('storeId') storeId: string,
  ) {
    return this.inventoryService.getExpiryAlerts(tenantId, storeId);
  }

  @Post('adjust')
  @Permissions('stock:adjust')
  @ApiOperation({ summary: 'Realizar movimentação ou ajuste manual de estoque' })
  async adjustStock(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: CreateStockMovementDto,
  ) {
    return this.inventoryService.adjustStock(tenantId, { ...body, userId });
  }

  @Post('counts')
  @Permissions('stock:inventory')
  @ApiOperation({ summary: 'Abrir nova sessão de contagem de inventário' })
  async createInventoryCount(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { storeId: string; notes?: string },
  ) {
    return this.inventoryService.createInventoryCount(tenantId, body.storeId, userId, body.notes);
  }

  @Put('counts/:countId/items/:itemId')
  @Permissions('stock:inventory')
  @ApiOperation({ summary: 'Atualizar contagem conferida de um item' })
  async updateInventoryCountItem(
    @CurrentUser('tenantId') tenantId: string,
    @Param('countId') countId: string,
    @Param('itemId') itemId: string,
    @Body() body: { countedQty: number; notes?: string },
  ) {
    return this.inventoryService.updateInventoryCountItem(tenantId, countId, itemId, body.countedQty, body.notes);
  }

  @Post('counts/:countId/apply')
  @Permissions('stock:inventory')
  @ApiOperation({ summary: 'Aplicar ajustes do inventário ao estoque com auditoria' })
  async applyInventoryCount(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('countId') countId: string,
  ) {
    return this.inventoryService.applyInventoryCount(tenantId, countId, userId);
  }
}
