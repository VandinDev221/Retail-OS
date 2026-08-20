import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Lojas & Terminais')
@ApiBearerAuth()
@Controller('stores')
@UseGuards(PermissionsGuard)
export class StoresController {
  constructor(private storesService: StoresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as lojas da empresa' })
  async findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.storesService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma loja' })
  async findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.storesService.findById(tenantId, id);
  }

  @Post()
  @Permissions('stores:manage')
  @ApiOperation({ summary: 'Criar nova loja com terminal e estoque padrão' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { name: string; code?: string; address?: string; phone?: string },
  ) {
    return this.storesService.create(tenantId, body);
  }

  @Put(':id')
  @Permissions('stores:manage')
  @ApiOperation({ summary: 'Atualizar loja' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; code?: string; address?: string; phone?: string; active?: boolean },
  ) {
    return this.storesService.update(tenantId, id, body);
  }

  @Post(':id/terminals')
  @Permissions('stores:manage')
  @ApiOperation({ summary: 'Adicionar novo terminal/PDV à loja' })
  async createTerminal(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') storeId: string,
    @Body() body: { name: string; code: string },
  ) {
    return this.storesService.createTerminal(tenantId, storeId, body);
  }
}
