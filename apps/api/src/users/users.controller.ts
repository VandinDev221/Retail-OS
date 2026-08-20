import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserRoleType } from '@prisma/client';

@ApiTags('Usuários & Perfis')
@ApiBearerAuth()
@Controller('users')
@UseGuards(PermissionsGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Listar todos os usuários da empresa' })
  async findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get('roles-permissions')
  @Permissions('roles:manage')
  @ApiOperation({ summary: 'Listar perfis e permissões disponíveis' })
  async getRolesAndPermissions(@CurrentUser('tenantId') tenantId: string) {
    return this.usersService.getRolesAndPermissions(tenantId);
  }

  @Get(':id')
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Obter detalhes de um usuário' })
  async findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.usersService.findById(tenantId, id);
  }

  @Post()
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Criar novo usuário' })
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { email: string; name: string; password: string; role: UserRoleType; storeId?: string },
  ) {
    return this.usersService.create(tenantId, body);
  }

  @Put(':id')
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Atualizar usuário' })
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; password?: string; role?: UserRoleType; storeId?: string; active?: boolean },
  ) {
    return this.usersService.update(tenantId, id, body);
  }
}
