import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChatsService } from '../chats/chats.service';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly chatsService: ChatsService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.createUser({
      email: dto.email,
      displayName: dto.displayName,
      passwordHash,
      avatarUrl: dto.avatarUrl,
    });

    await this.chatsService.ensureUserInGlobalThread(user.id);
    return this.buildAuthResponse(user);
  }

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

    await this.chatsService.ensureUserInGlobalThread(user.id);
    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    isAdmin?: boolean;
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
      },
    };
  }
}
