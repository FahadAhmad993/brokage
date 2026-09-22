import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ChatsService } from '../chats/chats.service';
import { JwtPayload } from './types/jwt-payload.type';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly chatsService: ChatsService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Creates the account (unverified) and emails a signup code — does NOT
   * return a token yet. The account only becomes usable once
   * `verifyOtp({ purpose: 'signup' })` succeeds.
   */
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    let user: UserEntity;
    if (existing) {
      if (existing.isEmailVerified) {
        throw new ConflictException('Email already registered');
      }
      // Signed up before but never finished verifying (most commonly:
      // the OTP email failed to send) — pick up where they left off
      // instead of permanently locking them out of this email address.
      const passwordHash = await bcrypt.hash(dto.password, 10);
      user = await this.usersService.updateUnverifiedRegistration(existing.id, {
        displayName: dto.displayName,
        passwordHash,
        avatarUrl: dto.avatarUrl,
      });
    } else {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      user = await this.usersService.createUser({
        email: dto.email,
        displayName: dto.displayName,
        passwordHash,
        avatarUrl: dto.avatarUrl,
        isEmailVerified: false,
      });
    }

    await this.chatsService.ensureUserInGlobalThread(user.id);
    await this.otpService.issueCode(user.email, 'signup');

    return {
      email: user.email,
      message: 'We sent a verification code to your email.',
    };
  }

  /**
   * Checks the password and, if correct, emails a login code — does NOT
   * return a token yet. The token is only issued once
   * `verifyOtp({ purpose: 'login' })` succeeds, so a stolen password alone
   * is never enough to get in.
   */
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.isBlocked || user.isDisabled) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'ACCOUNT_DISABLED',
        message: 'This account is no longer active',
        reason: user.disabledReason ?? null,
      });
    }

    // An account that never finished its signup verification gets a
    // signup code here instead of a login code — same inbox flow, correct
    // wording, and it also flips `isEmailVerified` once completed.
    const purpose = user.isEmailVerified ? 'login' : 'signup';
    await this.otpService.issueCode(user.email, purpose);

    return {
      email: user.email,
      purpose,
      message: 'We sent a sign-in code to your email.',
    };
  }

  /** The second step of both register() and login() above — this is what actually issues the JWT. */
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.otpService.verifyAndConsume(dto.email, dto.purpose, dto.code);

    if (dto.purpose === 'signup' && !user.isEmailVerified) {
      await this.usersService.markEmailVerified(user.id);
      user.isEmailVerified = true;
    }

    await this.chatsService.ensureUserInGlobalThread(user.id);
    return this.buildAuthResponse(user);
  }

  /** Re-sends whichever code was last issued for this email — subject to OtpService's 60s cooldown. */
  async resendOtp(dto: ResendOtpDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      // Don't reveal whether the email exists — same response either way.
      return { message: 'If that email has a pending code, we resent it.' };
    }
    const purpose = dto.purpose ?? (user.isEmailVerified ? 'login' : 'signup');
    await this.otpService.issueCode(user.email, purpose);
    return { message: 'If that email has a pending code, we resent it.' };
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    isAdmin?: boolean;
    phone?: string;
    estateName?: string;
    bio?: string;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin ?? false,
    };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin ?? false,
        // Previously omitted here — login/register response silently
        // dropped these two even though they were correctly saved in the
        // database, so every fresh login/register overwrote the app's
        // locally cached profile with blanks. GET /users/me always
        // included them correctly; only this path was missing them.
        phone: user.phone,
        estateName: user.estateName,
        bio: user.bio,
      },
    };
  }
}