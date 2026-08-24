import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Empresa / Tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(PermissionsGuard)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Obter dados da empresa autenticada' })
  async getCurrent(@CurrentUser('tenantId') tenantId: string) {
    return this.tenantsService.findById(tenantId);
  }

  @Patch('current')
  @Permissions('settings:manage')
  @ApiOperation({ summary: 'Atualizar dados cadastrais e parâmetro fiscais da empresa' })
  async updateCurrent(
    @CurrentUser('tenantId') tenantId: string,
    @Body()
    body: {
      name?: string;
      phone?: string;
      cnpj?: string;
      email?: string;
      ie?: string;
      address?: string;
      crt?: string;
      cscToken?: string;
      cscId?: string;
      sefazEnvironment?: string;
      certificatePassword?: string;
      certificateName?: string;
    },
  ) {
    return this.tenantsService.updateTenant(tenantId, body);
  }
}
