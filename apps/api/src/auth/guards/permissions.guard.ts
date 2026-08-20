import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Acesso não autorizado. Por favor, faça login novamente.');
    }

    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      return true;
    }

    // Regras estritas por papel (RBAC)
    const rolePermissionsMap: Record<string, string[]> = {
      GERENTE: ['sales:read', 'sales:create', 'sales:cancel', 'inventory:read', 'inventory:write', 'cash:read', 'cash:write', 'reports:read', 'customers:read', 'customers:write'],
      CAIXA: ['sales:read', 'sales:create', 'cash:read', 'cash:write', 'customers:read', 'customers:write'],
      ESTOQUISTA: ['inventory:read', 'inventory:write', 'products:read', 'products:write', 'purchases:read', 'suppliers:read'],
      VENDEDOR: ['sales:read', 'sales:create', 'customers:read', 'customers:write', 'products:read'],
    };

    const userPermissions = rolePermissionsMap[user.role] || [];
    const hasPermission = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasPermission) {
      throw new ForbiddenException(`Seu perfil (${user.role}) não possui permissão suficiente para esta operação.`);
    }

    return true;
  }
}
