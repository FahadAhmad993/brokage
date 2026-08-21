import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './types/jwt-payload.type';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Re-checks block/disable status on every authenticated request (not just
   * at login) so an admin action takes effect immediately instead of
   * waiting for the token to expire. Also refreshes `isAdmin` from the DB
   * so a promotion/demotion applies without forcing re-login.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('This account is no longer active');
    }
    if (user.isBlocked || user.isDisabled) {
      // Structured body so the app can render a dedicated forced-logout
      // screen with the admin's reason instead of a generic error toast.
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'ACCOUNT_DISABLED',
        message: 'This account is no longer active',
        reason: user.disabledReason ?? null,
      });
    }
    return { ...payload, isAdmin: user.isAdmin };
  }
}
