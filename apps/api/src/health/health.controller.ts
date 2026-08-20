import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe - verifica se o processo HTTP está respondendo' })
  getLive() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe - verifica dependências (PostgreSQL e Redis)' })
  async getReady(@Res() res: Response) {
    let dbStatus = 'healthy';
    let redisStatus = 'healthy';
    let isHealthy = true;

    // Checar conexão rápida com Neon PostgreSQL
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      dbStatus = 'unhealthy';
      isHealthy = false;
    }

    // Checar Redis (opcional / resiliente)
    try {
      await this.cacheService.set('health_check_ping', 'pong', 5);
      const pong = await this.cacheService.get('health_check_ping');
      if (pong !== 'pong') {
        redisStatus = 'degraded_in_memory';
      }
    } catch (error) {
      redisStatus = 'fallback_active';
    }

    const statusCode = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json({
      status: isHealthy ? 'ready' : 'not_ready',
      database: dbStatus,
      cache: redisStatus,
      timestamp: new Date().toISOString(),
    });
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check geral' })
  getHealth() {
    return {
      status: 'ok',
      service: 'Retail OS API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
