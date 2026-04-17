import nodemailer from 'nodemailer';
import { env } from './env';

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  pool: true,
  maxConnections: 5,
  connectionTimeout: env.SMTP_CONNECTION_TIMEOUT_MS,
  socketTimeout: env.SMTP_SOCKET_TIMEOUT_MS,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function verifySmtpTransport(): Promise<void> {
  try {
    await transporter.verify();
    console.log(`✅ SMTP transport ready (${env.SMTP_HOST}:${env.SMTP_PORT}, secure=${env.SMTP_SECURE})`);
  } catch (error) {
    const smtpError = error as Partial<{
      message: string;
      code: string;
      command: string;
      response: string;
      responseCode: number;
    }>;
    console.error('⚠️ SMTP transport verification failed', {
      message: smtpError.message || 'Unknown SMTP verification error',
      code: smtpError.code,
      command: smtpError.command,
      response: smtpError.response,
      responseCode: smtpError.responseCode,
    });
  }
}
