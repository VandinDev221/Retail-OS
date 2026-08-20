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

export interface GoogleAuthDto {
  email: string;
  name: string;
  googleId?: string;
  idToken?: string;
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

    const user = users[0];

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.tenant.active) {
      throw new UnauthorizedException('Empresa desativada');
    }

    return this.generateAuthResponse(user);
  }

  async googleAuth(dto: GoogleAuthDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim() || 'Usuário Google';

    // Procurar se o usuário já existe
    let user = await this.prisma.user.findFirst({
      where: {
        email,
        active: true,
        ...(dto.tenantSlug ? { tenant: { slug: dto.tenantSlug } } : {}),
      },
      include: {
        tenant: true,
      },
    });

    // Se o usuário não existir, cria a Conta / Tenant automaticamente ("Cadastrar com Google")
    if (!user) {
      const slugBase = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();
      const uniqueSlug = `${slugBase}-${Math.floor(1000 + Math.random() * 9000)}`;

      const tenant = await this.prisma.tenant.create({
        data: {
          name: `Loja ${name}`,
          slug: uniqueSlug,
          plan: 'PRO',
          active: true,
          stores: {
            create: {
              name: 'Loja Principal',
              code: 'MATRIZ-01',
              active: true,
            },
          },
        },
        include: {
          stores: true,
        },
      });

      const store = tenant.stores[0];
      const defaultPassword = await bcrypt.hash(`GoogleAuth@${Date.now()}`, 10);

      user = await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          storeId: store.id,
          email,
          name,
          role: UserRoleType.ADMIN,
          passwordHash: defaultPassword,
          active: true,
        },
        include: {
          tenant: true,
        },
      });
    }

    if (!user.tenant.active) {
      throw new UnauthorizedException('Empresa desativada');
    }

    return this.generateAuthResponse(user);
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

  private async generateAuthResponse(user: any) {
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

  async getUserPermissions(userId: string, tenantId: string, role: UserRoleType): Promise<string[]> {
    if (role === UserRoleType.SUPER_ADMIN || role === UserRoleType.ADMIN) {
      const allPerms = await this.prisma.permission.findMany({
        where: { tenantId },
      });
      return allPerms.map((p) => p.name);
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const permissionsSet = new Set<string>();
    userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        permissionsSet.add(rp.permission.name);
      });
    });

    return Array.from(permissionsSet);
  }
}
