import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Relatórios & Dashboard')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(PermissionsGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard')
  @Permissions('reports:sales')
  @ApiOperation({ summary: 'KPIs do Dashboard em tempo real' })
  async getDashboard(@CurrentUser('tenantId') tenantId: string, @Query('storeId') storeId?: string) {
    return this.reportsService.getDashboard(tenantId, storeId);
  }

  @Get('sales')
  @Permissions('reports:sales')
  @ApiOperation({ summary: 'Relatório de vendas por período e operadores' })
  async getSalesReport(
    @CurrentUser('tenantId') tenantId: string,
    @Query('storeId') storeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesReport(tenantId, storeId, startDate, endDate);
  }

  @Get('abc-curve')
  @Permissions('reports:stock')
  @ApiOperation({ summary: 'Curva ABC de produtos por faturamento' })
  async getAbcCurve(@CurrentUser('tenantId') tenantId: string, @Query('storeId') storeId?: string) {
    return this.reportsService.getAbcCurve(tenantId, storeId);
  }
}
