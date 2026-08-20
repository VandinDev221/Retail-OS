import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Fornecedores')
@ApiBearerAuth()
@Controller('suppliers')
@UseGuards(PermissionsGuard)
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  @Permissions('suppliers:read')
  @ApiOperation({ summary: 'Listar fornecedores' })
  async findAll(@CurrentUser('tenantId') tenantId: string, @Query('search') search?: string) {
    return this.suppliersService.findAll(tenantId, search);
  }

  @Get(':id')
  @Permissions('suppliers:read')
  @ApiOperation({ summary: 'Detalhes do fornecedor' })
  async findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.suppliersService.findById(tenantId, id);
  }

  @Post()
  @Permissions('suppliers:write')
  @ApiOperation({ summary: 'Cadastrar fornecedor' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { name: string; tradeName?: string; document?: string; email?: string; phone?: string; address?: string },
  ) {
    return this.suppliersService.create(tenantId, body);
  }

  @Put(':id')
  @Permissions('suppliers:write')
  @ApiOperation({ summary: 'Atualizar fornecedor' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; tradeName?: string; document?: string; email?: string; phone?: string; address?: string; active?: boolean },
  ) {
    return this.suppliersService.update(tenantId, id, body);
  }
}
