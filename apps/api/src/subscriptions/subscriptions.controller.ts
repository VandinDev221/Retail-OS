import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService, CreatePlanDto, CheckoutSubscriptionDto } from './subscriptions.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRoleType, SubscriptionStatus } from '@prisma/client';

@ApiTags('Assinaturas & Planos SaaS')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Listar planos de assinatura ativos (Público)' })
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Post('plans')
  @ApiOperation({ summary: 'Criar / Editar Plano (Apenas Super Admin)' })
  async upsertPlan(@CurrentUser('role') role: UserRoleType, @Body() dto: CreatePlanDto) {
    return this.subscriptionsService.upsertPlan(dto);
  }

  @Get('my-subscription')
  @ApiOperation({ summary: 'Obter assinatura da empresa logada' })
  async getMySubscription(@CurrentUser('tenantId') tenantId: string) {
    return this.subscriptionsService.getMySubscription(tenantId);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Assinar / Mudar de Plano (Upgrade)' })
  async checkout(@CurrentUser('tenantId') tenantId: string, @Body() dto: CheckoutSubscriptionDto) {
    return this.subscriptionsService.checkout(tenantId, dto);
  }

  // --- PLATAFORMA SUPER ADMIN ---

  @Get('superadmin/tenants')
  @ApiOperation({ summary: 'Listar todas as empresas e assinaturas da plataforma (Apenas Super Admin)' })
  async superAdminListTenants(@CurrentUser('role') role: UserRoleType) {
    return this.subscriptionsService.superAdminListTenants(role);
  }

  @Put('superadmin/tenants/:id/status')
  @ApiOperation({ summary: 'Ativar, Suspender ou Bloquear Empresa (Apenas Super Admin)' })
  async superAdminUpdateTenantStatus(
    @CurrentUser('role') role: UserRoleType,
    @Param('id') tenantId: string,
    @Body('active') active: boolean,
    @Body('status') status?: SubscriptionStatus,
  ) {
    return this.subscriptionsService.superAdminUpdateTenantStatus(role, tenantId, active, status);
  }

  @Get('superadmin/logs')
  @ApiOperation({ summary: 'Monitoramento de Logs e Saúde da Plataforma (Apenas Super Admin)' })
  async superAdminGetSystemLogs(@CurrentUser('role') role: UserRoleType) {
    return this.subscriptionsService.superAdminGetSystemLogs(role);
  }
}
