import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CashService, OpenSessionDto, CashMovementDto, CloseSessionDto } from './cash.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Caixa & Sessões de Caixa')
@ApiBearerAuth()
@Controller('cash')
@UseGuards(PermissionsGuard)
export class CashController {
  constructor(private cashService: CashService) {}

  @Get('registers')
  @Permissions('cash:open')
  @ApiOperation({ summary: 'Listar gavetas / caixas registradores da loja' })
  async getRegisters(@CurrentUser('tenantId') tenantId: string, @Query('storeId') storeId: string) {
    return this.cashService.getRegisters(tenantId, storeId);
  }

  @Get('active-session')
  @Permissions('cash:open')
  @ApiOperation({ summary: 'Consultar sessão de caixa aberta no momento' })
  async getActiveSession(
    @CurrentUser('tenantId') tenantId: string,
    @Query('storeId') storeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.cashService.getActiveSession(tenantId, storeId, userId);
  }

  @Post('open')
  @Permissions('cash:open')
  @ApiOperation({ summary: 'Abrir caixa com saldo inicial (fundo de troco)' })
  async openSession(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() body: OpenSessionDto,
  ) {
    return this.cashService.openSession(tenantId, userId, body);
  }

  @Post('sessions/:id/suprimento')
  @Permissions('cash:supply')
  @ApiOperation({ summary: 'Registrar suprimento de caixa (entrada de troco)' })
  async registerSuprimento(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
    @Body() body: CashMovementDto,
  ) {
    return this.cashService.registerSuprimento(tenantId, sessionId, userId, body);
  }

  @Post('sessions/:id/sangria')
  @Permissions('cash:sangria')
  @ApiOperation({ summary: 'Registrar sangria de caixa (retirada de segurança)' })
  async registerSangria(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
    @Body() body: CashMovementDto,
  ) {
    return this.cashService.registerSangria(tenantId, sessionId, userId, body);
  }

  @Post('sessions/:id/close')
  @Permissions('cash:close')
  @ApiOperation({ summary: 'Fechamento de caixa cego com conciliação e divergência' })
  async closeSession(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
    @Body() body: CloseSessionDto,
  ) {
    return this.cashService.closeSession(tenantId, sessionId, userId, body);
  }

  @Get('sessions/:id/report')
  @Permissions('cash:view_blind_closure')
  @ApiOperation({ summary: 'Relatório detalhado de fechamento de caixa' })
  async getSessionReport(@CurrentUser('tenantId') tenantId: string, @Param('id') sessionId: string) {
    return this.cashService.getSessionReport(tenantId, sessionId);
  }
}
