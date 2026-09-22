import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin wrapper around Brevo's (formerly Sendinblue) transactional email
 * REST API — https://api.brevo.com/v3/smtp/email. Deliberately not using
 * their SDK package: this is the one API call this app needs, and a plain
 * `fetch` avoids pulling in a whole SDK for it.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY', '');
    this.senderEmail = this.configService.get<string>(
      'BREVO_SENDER_EMAIL',
      'no-reply@brokage.app',
    );
    this.senderName = this.configService.get<string>(
      'BREVO_SENDER_NAME',
      'Brokage',
    );
  }

  async sendOtpEmail(
    to: string,
    code: string,
    purpose: 'signup' | 'login',
  ): Promise<void> {
    const subject =
      purpose === 'signup'
        ? 'Verify your Brokage account'
        : 'Your Brokage sign-in code';
    const heading =
      purpose === 'signup' ? 'Verify your email' : "Confirm it's you";
    const body =
      purpose === 'signup'
        ? 'Enter this code in the app to finish creating your account. It expires in 10 minutes.'
        : 'Enter this code in the app to finish signing in. It expires in 10 minutes.';

    const html = `
      <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 4px;">${heading}</h2>
        <p style="color: #555;">${body}</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #f5f3ef; padding: 16px 24px; border-radius: 12px; text-align: center; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #999; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    await this.send(to, subject, html);
  }

  private async send(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    if (!this.apiKey) {
      // Fails loudly rather than silently pretending an email went out —
      // an admin who forgot to set BREVO_API_KEY needs to know immediately,
      // not discover it when users report never receiving a code.
      this.logger.error('BREVO_API_KEY is not set — cannot send email');
      throw new Error('Email service is not configured');
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      this.logger.error(
        `Brevo send failed (${response.status}): ${errorBody.slice(0, 500)}`,
      );
      throw new Error('Could not send email right now. Please try again.');
    }
  }
}
