import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Clientes')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(PermissionsGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @Permissions('customers:read')
  @ApiOperation({ summary: 'Listar clientes ou buscar por nome/CPF/telefone' })
  async findAll(@CurrentUser('tenantId') tenantId: string, @Query('search') search?: string) {
    return this.customersService.findAll(tenantId, search);
  }

  @Get(':id')
  @Permissions('customers:read')
  @ApiOperation({ summary: 'Detalhes do cliente' })
  async findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.customersService.findById(tenantId, id);
  }

  @Post()
  @Permissions('customers:write')
  @ApiOperation({ summary: 'Cadastrar cliente' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { name: string; document?: string; email?: string; phone?: string; address?: string; creditLimit?: number },
  ) {
    return this.customersService.create(tenantId, body);
  }

  @Put(':id')
  @Permissions('customers:write')
  @ApiOperation({ summary: 'Atualizar cliente' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; document?: string; email?: string; phone?: string; address?: string; creditLimit?: number; active?: boolean },
  ) {
    return this.customersService.update(tenantId, id, body);
  }
}
