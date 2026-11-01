import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.js';

/**
 * SMTP sender. Production uses Google Workspace (smtp.gmail.com:465, App Password)
 * for the @ngiliyun.my.id domain. When SMTP is not configured, emails are logged and skipped.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;

  constructor() {
    this.transporter =
      env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
        ? nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
          })
        : null;
  }

  get enabled(): boolean {
    return this.transporter != null;
  }

  async send(to: string, subject: string, html: string, text: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`SMTP not configured, skipping email to ${to}: ${subject}`);
      throw new Error('SMTP not configured');
    }
    await this.transporter.sendMail({ from: env.MAIL_FROM, to, subject, html, text });
  }
}
