import { Controller, Post, Headers, UnauthorizedException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Internal Jobs & Cron')
@Controller('internal/jobs')
export class JobsController {
  constructor(
    private jobsService: JobsService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Post('process')
  @ApiOperation({ summary: 'Processar lote de tarefas assíncronas (Disparado por Cron externo)' })
  @ApiHeader({ name: 'x-cron-secret', required: true, description: 'Segredo de autenticação do Cron' })
  async processJobs(
    @Headers('x-cron-secret') cronSecret: string,
    @Query('batchSize') batchSize?: string,
  ) {
    const expectedSecret = this.configService.get<string>('INTERNAL_CRON_SECRET') || 'retail-os-cron-secret-key-123456';
    if (!cronSecret || cronSecret !== expectedSecret) {
      throw new UnauthorizedException('Segredo de Cron inválido');
    }

    return this.jobsService.processBatch(batchSize ? parseInt(batchSize, 10) : 10);
  }
}
