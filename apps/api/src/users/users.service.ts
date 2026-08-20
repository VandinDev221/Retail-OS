import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        storeId: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        storeId: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(tenantId: string, data: { email: string; name: string; password: string; role: UserRoleType; storeId?: string }) {
    const email = data.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email },
    });

    if (existing) {
      throw new ConflictException('Já existe um usuário com este e-mail');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const targetRole = data.role === UserRoleType.SUPER_ADMIN ? UserRoleType.ADMIN : data.role;

    return this.prisma.user.create({
      data: {
        tenantId,
        email,
        name: data.name,
        passwordHash,
        role: targetRole,
        storeId: data.storeId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        storeId: true,
        createdAt: true,
      },
    });
  }

  async update(tenantId: string, id: string, data: { name?: string; email?: string; password?: string; role?: UserRoleType; storeId?: string; active?: boolean }) {
    const user = await this.findById(tenantId, id);

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email.trim().toLowerCase();
    if (data.role) {
      updateData.role = data.role === UserRoleType.SUPER_ADMIN ? UserRoleType.ADMIN : data.role;
    }
    if (data.storeId !== undefined) updateData.storeId = data.storeId;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        storeId: true,
        createdAt: true,
      },
    });
  }

  async getRolesAndPermissions(tenantId: string) {
    const [roles, permissions] = await Promise.all([
      this.prisma.role.findMany({
        where: { tenantId },
        include: { rolePermissions: { include: { permission: true } } },
      }),
      this.prisma.permission.findMany({
        where: { tenantId },
      }),
    ]);
    return { roles, permissions };
  }
}
