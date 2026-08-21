import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { JwtPayload } from '../../modules/auth/types/jwt-payload.type';

/**
 * Gate for `/admin/*` routes. Always pair with `JwtAuthGuard` (put it first
 * in `@UseGuards(JwtAuthGuard, AdminGuard)`) — this guard only checks the
 * already-authenticated `request.user.isAdmin` flag, it doesn't verify the
 * token itself.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!request.user?.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
