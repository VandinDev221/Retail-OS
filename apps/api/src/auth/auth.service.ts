import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRoleType } from '@prisma/client';

export interface LoginDto {
  email: string;
  password: string;
  tenantSlug?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    // Buscar usuário pelo e-mail
    const users = await this.prisma.user.findMany({
      where: {
        email,
        active: true,
        ...(dto.tenantSlug ? { tenant: { slug: dto.tenantSlug } } : {}),
      },
      include: {
        tenant: true,
      },
    });

    if (!users || users.length === 0) {
      throw new UnauthorizedException('Credenciais inválidas ou conta inativa');
    }

    // Se múltiplos tenants e nenhum slug informado, pega o primeiro ativo
    const user = users[0];

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.tenant.active) {
      throw new UnauthorizedException('Empresa desativada');
    }

    // Buscar permissões do usuário
    const permissions = await this.getUserPermissions(user.id, user.tenantId, user.role);

    // Gerar tokens
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      storeId: user.storeId,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'default-jwt-secret-for-dev',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, tenantId: user.tenantId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret-for-dev',
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
        tenantSlug: user.tenant.slug,
        storeId: user.storeId,
        permissions,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret-for-dev',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { tenant: true },
      });

      if (!user || !user.active || !user.tenant.active) {
        throw new UnauthorizedException('Sessão expirada');
      }

      const permissions = await this.getUserPermissions(user.id, user.tenantId, user.role);

      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        storeId: user.storeId,
        permissions,
      };

      const newAccessToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET') || 'default-jwt-secret-for-dev',
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
      });

      return {
        accessToken: newAccessToken,
      };
    } catch (err) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  async getUserPermissions(userId: string, tenantId: string, role: UserRoleType): Promise<string[]> {
    if (role === UserRoleType.SUPER_ADMIN || role === UserRoleType.ADMIN) {
      const allPerms = await this.prisma.permission.findMany({
        where: { tenantId },
        select: { key: true },
      });
      return allPerms.map((p) => p.key);
    }

    // Buscar permissões associadas aos perfis do usuário
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        role: {
          tenantId,
          userRoles: {
            some: { userId },
          },
        },
      },
      include: {
        permission: true,
      },
    });

    const set = new Set<string>();
    rolePermissions.forEach((rp) => set.add(rp.permission.key));

    return Array.from(set);
  }
}
