import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * A single one-time code sent to an email address — either to verify a new
 * signup or to complete a login. Keyed by email (not a user FK) since at
 * signup time the user row already exists but isn't "real" yet until this
 * is consumed, and keeping it decoupled avoids any FK/cascade complexity.
 *
 * The code itself is never stored in plaintext — only its bcrypt hash —
 * same principle as passwords, so a database read alone can't leak a
 * usable code.
 */
@Entity('otp_codes')
export class OtpCodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'text' })
  email!: string;

  @Column({ type: 'text' })
  codeHash!: string;

  @Column({ type: 'varchar', length: 16 })
  purpose!: 'signup' | 'login';

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  /** Wrong-code guesses against this row — locked out after 5. */
  @Column({ type: 'int', default: 0 })
  attempts!: number;

  /** Set once this code has been successfully used — a consumed code can never be reused. */
  @Column({ type: 'timestamp', nullable: true })
  consumedAt!: Date | null;

  /** Also doubles as the resend-cooldown anchor ("wait 60s since the last send"). */
  @CreateDateColumn()
  createdAt!: Date;
}
