import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  findById(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  createUser(payload: {
    email: string;
    displayName: string;
    passwordHash: string;
    avatarUrl?: string;
    isEmailVerified?: boolean;
  }) {
    const user = this.usersRepository.create({
      email: payload.email.toLowerCase(),
      displayName: payload.displayName,
      passwordHash: payload.passwordHash,
      avatarUrl: payload.avatarUrl,
      // Explicit override of the column's DB-level default (`true`, kept
      // that way so pre-existing accounts weren't retroactively locked
      // out when this feature shipped) — a fresh signup always starts
      // unverified unless the caller says otherwise.
      isEmailVerified: payload.isEmailVerified ?? false,
    });
    return this.usersRepository.save(user);
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      { isEmailVerified: true },
    );
  }

  /**
   * Re-registering with an email that already exists but never finished
   * verification (e.g. the OTP email failed to send the first time) — a
   * plain "email already registered" would leave that account stuck
   * forever with no way back in, since login also needs a working OTP
   * send. Updates the password/name in case they were mistyped the first
   * time and hands back the same row for a fresh OTP.
   */
  async updateUnverifiedRegistration(
    userId: string,
    payload: { displayName: string; passwordHash: string; avatarUrl?: string },
  ): Promise<UserEntity> {
    await this.usersRepository.update(
      { id: userId },
      {
        displayName: payload.displayName,
        passwordHash: payload.passwordHash,
        avatarUrl: payload.avatarUrl,
      },
    );
    return (await this.findById(userId))!;
  }

  async updateProfile(
    userId: string,
    updates: {
      displayName?: string;
      avatarUrl?: string;
      phone?: string;
      estateName?: string;
    },
  ) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.displayName = updates.displayName ?? user.displayName;
    user.avatarUrl = updates.avatarUrl ?? user.avatarUrl;
    user.phone = updates.phone ?? user.phone;
    user.estateName = updates.estateName ?? user.estateName;
    const saved = await this.usersRepository.save(user);
    return {
      id: saved.id,
      email: saved.email,
      displayName: saved.displayName,
      avatarUrl: saved.avatarUrl,
      bio: saved.bio,
      phone: saved.phone,
      estateName: saved.estateName,
    };
  }

  /**
   * Safe, non-sensitive profile view of another user — used by the chat
   * "tap a peer's name" screen. Deliberately omits `passwordHash` and any
   * other private fields; only whitelisted columns are returned.
   */
  async findPublicProfile(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      estateName: user.estateName,
    };
  }

  /**
   * Permanently delete the user and all data owned by them. The `users` row is
   * the cascade root: DB-level `ON DELETE CASCADE` foreign keys remove the
   * user's properties (and their images), chat messages, and chat
   * participations automatically, so a single delete is sufficient.
   */
  async deleteAccount(userId: string) {
    const result = await this.usersRepository.delete({ id: userId });
    if (!result.affected) {
      throw new NotFoundException('User not found');
    }
    return { success: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new ForbiddenException('Current password is incorrect');
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);
    return { success: true };
  }

  // ---- Admin panel -------------------------------------------------------

  /** Every registered user, newest first — backs the admin "Users" table. */
  async listAllForAdmin() {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      phone: u.phone,
      estateName: u.estateName,
      isAdmin: u.isAdmin,
      isBlocked: u.isBlocked,
      isDisabled: u.isDisabled,
      disabledReason: u.disabledReason ?? null,
      createdAt: u.createdAt,
    }));
  }

  /** Single user's full admin-facing profile (bio + phone + everything
   *  `listAllForAdmin` has, one row) — backs the admin "view profile" screen. */
  async getDetailForAdmin(userId: string) {
    const u = await this.usersRepository.findOne({ where: { id: userId } });
    if (!u) {
      throw new NotFoundException('User not found');
    }
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      bio: u.bio ?? null,
      phone: u.phone ?? null,
      estateName: u.estateName ?? null,
      isAdmin: u.isAdmin,
      isBlocked: u.isBlocked,
      isDisabled: u.isDisabled,
      disabledReason: u.disabledReason ?? null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  private async setFlag(
    userId: string,
    flag: 'isBlocked' | 'isDisabled',
    value: boolean,
    reason?: string,
  ) {
    const update: Partial<UserEntity> = { [flag]: value };
    // Only touch the reason when actually disabling/blocking (or explicitly
    // clearing it on re-enable) so re-enabling doesn't need a reason.
    if (value) {
      update.disabledReason = reason?.trim() || null;
    } else {
      update.disabledReason = null;
    }
    const result = await this.usersRepository.update({ id: userId }, update);
    if (!result.affected) {
      throw new NotFoundException('User not found');
    }
    return {
      success: true,
      userId,
      [flag]: value,
      disabledReason: update.disabledReason,
    };
  }

  setBlocked(userId: string, blocked: boolean, reason?: string) {
    return this.setFlag(userId, 'isBlocked', blocked, reason);
  }

  setDisabled(userId: string, disabled: boolean, reason?: string) {
    return this.setFlag(userId, 'isDisabled', disabled, reason);
  }

  /** Admin-triggered delete — same cascade behavior as self-service delete. */
  adminDeleteUser(userId: string) {
    return this.deleteAccount(userId);
  }
}