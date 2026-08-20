import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notificações do Sistema')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações do usuário e gerais da loja' })
  async findAll(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.findAll(tenantId, userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  async markAsRead(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.notificationsService.markAsRead(tenantId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  async markAllAsRead(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(tenantId, userId);
  }
}
