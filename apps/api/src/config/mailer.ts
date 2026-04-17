import nodemailer from 'nodemailer';
import { env } from './env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export interface SmtpMailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendSmtpEmail(options: SmtpMailOptions): Promise<void> {
  const to = Array.isArray(options.to) ? options.to : [options.to];

  await transporter.sendMail({
    from: options.from,
    to,
    subject: options.subject,
    html: options.html,
    ...(options.text ? { text: options.text } : {}),
  });
}

export async function verifySmtpTransport(): Promise<void> {
  if (
    env.SMTP_USER.startsWith('placeholder') ||
    env.SMTP_PASS.startsWith('placeholder')
  ) {
    console.warn('[SMTP] Placeholder credentials detected; skipping transport verification');
    return;
  }

  await transporter.verify();
  console.log('[SMTP] Transport verified');
}
