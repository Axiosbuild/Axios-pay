import nodemailer from 'nodemailer';
import { env } from './env';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? env.SMTP_PORT),
  secure: env.SMTP_SECURE,
  pool: true,
  maxConnections: 5,
  connectionTimeout: env.SMTP_CONNECTION_TIMEOUT_MS,
  socketTimeout: env.SMTP_SOCKET_TIMEOUT_MS,
  auth: {
    user: process.env.SMTP_USER ?? env.SMTP_USER,
    pass: process.env.SMTP_PASS ?? env.SMTP_PASS,
  },
});

export async function verifySmtpTransport(): Promise<void> {
  try {
    await transporter.verify();
    console.log('[SMTP] Connection verified');
  } catch (error) {
    console.error('[SMTP] Failed:', error);
  }
}
