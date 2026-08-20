import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRoleType } from '@prisma/client';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export interface LoginDto {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  storeName?: string;
  planSlug?: string;
  billingCycle?: 'MONTHLY' | 'YEARLY';
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
    private subscriptionsService: SubscriptionsService,
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
      throw new UnauthorizedException('E-mail ou senha incorretos. Caso seja seu primeiro acesso, clique na aba "Criar Conta".');
    }

    const user = users[0];

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    if (user.role !== UserRoleType.SUPER_ADMIN && user.tenant && !user.tenant.active) {
      throw new UnauthorizedException('Sua conta possui pendência de pagamento ou está inativa. Conclua o pagamento do plano para liberar o acesso ao sistema.');
    }

    return this.generateAuthResponse(user);
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const planSlug = dto.planSlug || 'pro';
    const billingCycle = dto.billingCycle || 'MONTHLY';

    if (!email || !dto.password || dto.password.length < 6) {
      throw new BadRequestException('Informe um e-mail válido e senha com no mínimo 6 caracteres.');
    }

    // Verificar se e-mail já existe
    const existingUser = await this.prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Este e-mail já está cadastrado. Utilize a opção Entrar.');
    }

    const storeName = dto.storeName?.trim() || `Loja de ${name}`;
    const slugBase = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();
    const uniqueSlug = `${slugBase}-${Math.floor(1000 + Math.random() * 9000)}`;

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: storeName,
        slug: uniqueSlug,
        plan: planSlug.toUpperCase(),
        active: false, // Inativo até a confirmação do pagamento
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

    await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        storeId: store.id,
        email,
        name,
        role: UserRoleType.ADMIN,
        passwordHash,
        active: true,
      },
      include: {
        tenant: true,
      },
    });

    // Criar Sessão do Stripe Checkout para o plano selecionado
    const checkoutRes = await this.subscriptionsService.createStripeCheckoutSession(tenant.id, {
      planSlug,
      billingCycle,
    });

    return {
      message: 'Conta registrada com sucesso! Efetue o pagamento para liberar seu acesso ao sistema.',
      checkoutUrl: checkoutRes.checkoutUrl,
      tenantId: tenant.id,
    };
  }

  async googleAuth(dto: GoogleAuthDto) {
    let email = dto.email?.trim()?.toLowerCase();
    let name = dto.name?.trim() || 'Usuário Google';

    // Validação server-side do idToken do Google se fornecido
    if (dto.idToken) {
      try {
        const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${dto.idToken}`);
        if (res.ok) {
          const googleInfo = await res.json();
          if (googleInfo.email) {
            email = googleInfo.email.trim().toLowerCase();
            if (googleInfo.name) name = googleInfo.name.trim();
          }
        }
      } catch (tokenErr) {
        console.error('Erro ao validar idToken na API do Google:', tokenErr);
      }
    }

    if (!email) {
      throw new BadRequestException('E-mail do Google não identificado ou token inválido.');
    }

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

    // Se o usuário não existir, cria a Conta / Tenant em estado inativo e redireciona para o Checkout
    if (!user) {
      const slugBase = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();
      const uniqueSlug = `${slugBase}-${Math.floor(1000 + Math.random() * 9000)}`;

      const tenant = await this.prisma.tenant.create({
        data: {
          name: `Loja ${name}`,
          slug: uniqueSlug,
          plan: 'PRO',
          active: false, // Inativo até confirmação de pagamento
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

      const checkoutRes = await this.subscriptionsService.createStripeCheckoutSession(tenant.id, {
        planSlug: 'pro',
        billingCycle: 'MONTHLY',
      });

      return {
        message: 'Conta Google criada com sucesso! Conclua o pagamento para liberar seu acesso.',
        checkoutUrl: checkoutRes.checkoutUrl,
        tenantId: tenant.id,
      };
    }

    if (!user.tenant.active) {
      throw new UnauthorizedException('Sua conta possui pendência de pagamento ou está inativa. Conclua o pagamento do plano para liberar o acesso ao sistema.');
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

      if (!user || !user.active || (user.role !== UserRoleType.SUPER_ADMIN && user.tenant && !user.tenant.active)) {
        throw new UnauthorizedException('Sessão expirada');
      }

      const permissions = await this.getUserPermissions(user.id, user.tenantId, user.role);

      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId || null,
        storeId: user.storeId || null,
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
      tenantId: user.tenantId || null,
      storeId: user.storeId || null,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'default-jwt-secret-for-dev',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, tenantId: user.tenantId || null },
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
        tenantId: user.tenantId || null,
        tenantName: user.tenant?.name || 'Plataforma RetailSyn',
        tenantSlug: user.tenant?.slug || 'superadmin',
        storeId: user.storeId || null,
        permissions,
      },
    };
  }

  async getUserPermissions(userId: string, tenantId: string | null, role: UserRoleType): Promise<string[]> {
    if (role === UserRoleType.SUPER_ADMIN) {
      return ['superadmin:manage', 'tenants:manage', 'users:manage'];
    }

    if (role === UserRoleType.ADMIN) {
      if (!tenantId) return ['*'];
      const allPerms = await this.prisma.permission.findMany({
        where: { tenantId },
      });
      const keys = allPerms.map((p) => p.key);
      return keys.length > 0 ? keys : ['*'];
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
        if (rp.permission?.key) {
          permissionsSet.add(rp.permission.key);
        }
      });
    });

    if (role === UserRoleType.GERENTE) {
      permissionsSet.add('settings:manage');
      permissionsSet.add('reports:sales');
      permissionsSet.add('reports:stock');
      permissionsSet.add('stock:read');
      permissionsSet.add('stock:lots');
      permissionsSet.add('stock:adjust');
      permissionsSet.add('stock:inventory');
      permissionsSet.add('cash:open');
      permissionsSet.add('cash:close');
      permissionsSet.add('cash:supply');
      permissionsSet.add('cash:sangria');
      permissionsSet.add('cash:view_blind_closure');
    } else if (role === UserRoleType.CAIXA) {
      permissionsSet.add('cash:open');
      permissionsSet.add('cash:close');
      permissionsSet.add('cash:supply');
      permissionsSet.add('cash:sangria');
      permissionsSet.add('stock:read');
    }

    return Array.from(permissionsSet);
  }
}
