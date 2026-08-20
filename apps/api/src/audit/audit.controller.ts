import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Auditoria')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(PermissionsGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Permissions('audit:read')
  @ApiOperation({ summary: 'Listar registros de auditoria com paginação' })
  async getLogs(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('entity') entity?: string,
  ) {
    return this.auditService.getLogs(tenantId, parseInt(page, 10), parseInt(limit, 10), entity);
  }
}
