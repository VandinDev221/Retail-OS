import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';
import { AuditService } from './audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Auditoria')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(RolesGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles(UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar registros de auditoria com paginação (Apenas Super Admin)' })
  async getLogs(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('entity') entity?: string,
  ) {
    return this.auditService.getLogs(tenantId, parseInt(page, 10), parseInt(limit, 10), entity);
  }
}
