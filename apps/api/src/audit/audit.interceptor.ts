import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, ip, headers } = request;

    // Apenas mutações são auditadas por padrão
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const parts = url.split('?')[0].split('/');
      const entity = parts[3] || parts[2] || 'UNKNOWN';

      return next.handle().pipe(
        tap((response) => {
          if (user && user.tenantId) {
            this.auditService.log({
              tenantId: user.tenantId,
              userId: user.sub || user.id,
              action: `${method}_${entity.toUpperCase()}`,
              entity,
              entityId: response?.id || body?.id,
              newData: response || body,
              ipAddress: ip,
              userAgent: headers['user-agent'],
            });
          }
        }),
      );
    }

    return next.handle();
  }
}
