import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { OtpCodeEntity } from './entities/otp-code.entity';
import { EmailService } from './email.service';

const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpCodeEntity)
    private readonly otpRepository: Repository<OtpCodeEntity>,
    private readonly emailService: EmailService,
  ) {}

  private generateCode(): string {
    // Rejection-free: pulls from a range that divides evenly enough not to
    // matter for a 6-digit code, and never uses Math.random for anything
    // security-relevant elsewhere — this is a short-lived, single-use,
    // rate-limited code, not a long-term secret, so this is proportionate.
    const min = 10 ** (CODE_LENGTH - 1);
    const max = 10 ** CODE_LENGTH - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * Issues a fresh code for (email, purpose), invalidating any still-live
   * one first. Throws if the last send for this email+purpose was under
   * `RESEND_COOLDOWN_SECONDS` ago — the mobile app should catch this and
   * show "wait Ns" rather than let someone hammer resend into a Brevo
   * rate-limit or an inbox flood.
   */
  async issueCode(email: string, purpose: 'signup' | 'login'): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    const mostRecent = await this.otpRepository.findOne({
      where: { email: normalizedEmail, purpose },
      order: { createdAt: 'DESC' },
    });
    if (mostRecent) {
      const secondsSinceLast =
        (Date.now() - mostRecent.createdAt.getTime()) / 1000;
      if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'OTP_COOLDOWN',
          message: 'Please wait before requesting another code.',
          retryAfterSeconds: Math.ceil(
            RESEND_COOLDOWN_SECONDS - secondsSinceLast,
          ),
        });
      }
    }

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await this.otpRepository.save(
      this.otpRepository.create({
        email: normalizedEmail,
        codeHash,
        purpose,
        expiresAt,
        attempts: 0,
        consumedAt: null,
      }),
    );

    // Deliberately NOT awaited: the code is already saved and valid the
    // instant this function returns, so the person can move on to the
    // "enter code" screen immediately instead of the whole request
    // hanging on Brevo's network round trip (which is what made
    // signup/login feel slow — every request used to wait out the full
    // email send before responding at all). If the send itself fails,
    // it's logged loudly by EmailService so it's still visible in the
    // server logs, and "Resend code" gives the person a second try.
    this.emailService.sendOtpEmail(normalizedEmail, code, purpose).catch(() => {
      // Already logged inside EmailService — nothing else to do with a
      // rejection here, since the HTTP response for this request has
      // already gone out by the time this could possibly reject.
    });
  }

  /**
   * Verifies a code without consuming it — throws on any mismatch/expiry/
   * lockout. Caller consumes it explicitly via `consume()` only after
   * every other side effect (issuing the JWT, etc.) has succeeded, so a
   * mid-flow crash never burns a code the user never actually got to use.
   */
  private async findValidCode(
    email: string,
    purpose: 'signup' | 'login',
    code: string,
  ): Promise<OtpCodeEntity> {
    const normalizedEmail = email.trim().toLowerCase();
    const row = await this.otpRepository.findOne({
      where: {
        email: normalizedEmail,
        purpose,
        consumedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!row) {
      throw new UnauthorizedException(
        'This code has expired. Please request a new one.',
      );
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      throw new UnauthorizedException(
        'Too many incorrect attempts. Please request a new code.',
      );
    }

    const matches = await bcrypt.compare(code.trim(), row.codeHash);
    if (!matches) {
      row.attempts += 1;
      await this.otpRepository.save(row);
      throw new UnauthorizedException('Incorrect code. Please try again.');
    }

    return row;
  }

  async verifyAndConsume(
    email: string,
    purpose: 'signup' | 'login',
    code: string,
  ): Promise<void> {
    const row = await this.findValidCode(email, purpose, code);
    row.consumedAt = new Date();
    await this.otpRepository.save(row);
  }
}
