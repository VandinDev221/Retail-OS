import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService, CreatePlanDto, CheckoutSubscriptionDto } from './subscriptions.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRoleType, SubscriptionStatus } from '@prisma/client';

@ApiTags('Assinaturas & Stripe SaaS')
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
  @ApiOperation({ summary: 'Assinar / Mudar de Plano (Upgrade Direto)' })
  async checkout(@CurrentUser('tenantId') tenantId: string, @Body() dto: CheckoutSubscriptionDto) {
    return this.subscriptionsService.checkout(tenantId, dto);
  }

  // --- INTEGRAÇÃO STRIPE ---

  @Post('stripe/create-checkout-session')
  @ApiOperation({ summary: 'Criar Sessão de Checkout Hospedada no Stripe' })
  async createStripeCheckoutSession(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CheckoutSubscriptionDto,
  ) {
    return this.subscriptionsService.createStripeCheckoutSession(tenantId, dto);
  }

  @Post('stripe/portal-session')
  @ApiOperation({ summary: 'Abrir Portal do Cliente Stripe (Gerenciar Cartão / Cancelar)' })
  async createStripeCustomerPortal(@CurrentUser('tenantId') tenantId: string) {
    return this.subscriptionsService.createStripeCustomerPortal(tenantId);
  }

  @Public()
  @Post('stripe/confirm-session')
  @ApiOperation({ summary: 'Confirmar Ativação de Sessão do Stripe Checkout Pós-Pagamento' })
  async confirmStripeSession(@Body('sessionId') sessionId: string) {
    return this.subscriptionsService.confirmStripeSession(sessionId);
  }

  @Public()
  @Post('stripe/webhook')
  @ApiOperation({ summary: 'Webhook Oficial da Stripe para Confirmação de Pagamento' })
  async handleStripeWebhook(@Body() event: any) {
    return this.subscriptionsService.handleStripeWebhook(event);
  }

  // --- PLATAFORMA SUPER ADMIN ---

  @Get('superadmin/tenants')
  @ApiOperation({ summary: 'Listar todas as empresas e assinaturas da plataforma (Apenas Super Admin)' })
  async superAdminListTenants(@CurrentUser('role') role: UserRoleType) {
    return this.subscriptionsService.superAdminListTenants(role);
  }

  @Post('superadmin/tenants')
  @ApiOperation({ summary: 'Criar nova Empresa / Tenant (Apenas Super Admin)' })
  async superAdminCreateTenant(
    @CurrentUser('role') role: UserRoleType,
    @Body() body: { name: string; slug?: string; cnpj?: string; email?: string; phone?: string; plan?: string },
  ) {
    return this.subscriptionsService.superAdminCreateTenant(role, body);
  }

  @Put('superadmin/tenants/:id')
  @ApiOperation({ summary: 'Editar Empresa / Tenant (Apenas Super Admin)' })
  async superAdminUpdateTenant(
    @CurrentUser('role') role: UserRoleType,
    @Param('id') tenantId: string,
    @Body() body: { name?: string; cnpj?: string; email?: string; phone?: string; plan?: string; active?: boolean },
  ) {
    return this.subscriptionsService.superAdminUpdateTenant(role, tenantId, body);
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

  @Delete('superadmin/tenants/:id')
  @ApiOperation({ summary: 'Excluir Empresa / Tenant (Apenas Super Admin)' })
  async superAdminDeleteTenant(@CurrentUser('role') role: UserRoleType, @Param('id') tenantId: string) {
    return this.subscriptionsService.superAdminDeleteTenant(role, tenantId);
  }

  @Get('superadmin/users')
  @ApiOperation({ summary: 'Listar todos os Usuários da Plataforma (Apenas Super Admin)' })
  async superAdminListUsers(@CurrentUser('role') role: UserRoleType) {
    return this.subscriptionsService.superAdminListUsers(role);
  }

  @Post('superadmin/users')
  @ApiOperation({ summary: 'Criar Usuário para qualquer Empresa (Apenas Super Admin)' })
  async superAdminCreateUser(
    @CurrentUser('role') role: UserRoleType,
    @Body() body: { tenantId: string; name: string; email: string; password?: string; role: UserRoleType },
  ) {
    return this.subscriptionsService.superAdminCreateUser(role, body);
  }

  @Put('superadmin/users/:id')
  @ApiOperation({ summary: 'Editar Usuário da Plataforma (Apenas Super Admin)' })
  async superAdminUpdateUser(
    @CurrentUser('role') role: UserRoleType,
    @Param('id') userId: string,
    @Body() body: { name?: string; email?: string; password?: string; role?: UserRoleType; active?: boolean; tenantId?: string },
  ) {
    return this.subscriptionsService.superAdminUpdateUser(role, userId, body);
  }

  @Delete('superadmin/users/:id')
  @ApiOperation({ summary: 'Excluir Usuário da Plataforma (Apenas Super Admin)' })
  async superAdminDeleteUser(@CurrentUser('role') role: UserRoleType, @Param('id') userId: string) {
    return this.subscriptionsService.superAdminDeleteUser(role, userId);
  }

  @Get('superadmin/logs')
  @ApiOperation({ summary: 'Monitoramento de Logs e Saúde da Plataforma (Apenas Super Admin)' })
  async superAdminGetSystemLogs(@CurrentUser('role') role: UserRoleType) {
    return this.subscriptionsService.superAdminGetSystemLogs(role);
  }
}
