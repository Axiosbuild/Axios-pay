import nodemailer from 'nodemailer';
import { env } from './env';

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// Verify SMTP connection at startup so misconfiguration is visible in logs.
transporter.verify((error) => {
  if (error) {
    console.warn('⚠️  SMTP transport verification failed:', error.message);
  } else {
    console.log('✅  SMTP transport ready — connected to smtp.gmail.com:465');
  }
});
