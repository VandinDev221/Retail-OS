import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, LoginDto } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RateLimitService } from '../infrastructure/rate-limit.service';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private rateLimitService: RateLimitService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login com email e senha' })
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.ip || '127.0.0.1';
    // Rate limit agressivo para proteção contra brute-force
    await this.rateLimitService.checkLimit(`login:${ip}:${dto.email}`, 10, 60);
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Renovar Access Token com Refresh Token' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter dados do usuário logado' })
  async getMe(@CurrentUser() user: any) {
    return { user };
  }
}
