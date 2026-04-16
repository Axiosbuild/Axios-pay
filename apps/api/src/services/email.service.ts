import crypto from 'crypto';
import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';
import type SMTPPool from 'nodemailer/lib/smtp-pool';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { z } from 'zod';
import { env } from '../config/env';

type SMTPError = Error & {
  code?: string;
  command?: string;
  responseCode?: number;
  response?: string;
};

const EMAIL_SCHEMA = z.string().trim().email();
const GMAIL_APP_PASSWORD_FORMAT_REGEX = /^[A-Za-z0-9]{16}$/;
const MAX_RETRY_ATTEMPTS = 3;
// Fixed 1s retry delay keeps retry latency bounded so total send time stays within function timeout budgets.
const RETRY_DELAY_MS = 1000;
const SEND_MAIL_TIMEOUT_MS = 5000;

const SMTP_HOST = env.SMTP_HOST;
const SMTP_PORT = env.SMTP_PORT;
const SMTP_SECURE = SMTP_PORT === 465 ? true : env.SMTP_SECURE;
const SMTP_REQUIRE_TLS = SMTP_PORT === 587;
const IS_GMAIL_SMTP = (SMTP_HOST ?? '').toLowerCase() === 'smtp.gmail.com';
const GMAIL_SERVICE_CONFIG = IS_GMAIL_SMTP ? { service: 'gmail' as const } : {};
const SHOULD_USE_POOL = env.SMTP_POOL && !IS_GMAIL_SMTP;
const SMTP_USER = env.SMTP_USER.trim();
const SMTP_PASS = env.SMTP_PASS.trim();
const SMTP_REPLY_TO = env.SMTP_REPLY_TO ?? SMTP_USER;

const TRANSIENT_ERROR_CODES = new Set([
  'ECONNECTION',
  'ECONNRESET',
  'EHOSTUNREACH',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'ESOCKET',
]);

function applyGmailTransportOverrides<T extends SMTPPool.Options | SMTPTransport.Options>(
  transportOptions: T
): T {
  if (!IS_GMAIL_SMTP) {
    return transportOptions;
  }

  return {
    ...transportOptions,
    port: 465,
    secure: true,
    requireTLS: false,
  };
}

function createPooledTransporter(): Transporter {
  const transportOptions: SMTPPool.Options = {
    ...GMAIL_SERVICE_CONFIG,
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    requireTLS: SMTP_REQUIRE_TLS,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    pool: true,
    maxConnections: env.SMTP_MAX_CONNECTIONS,
    maxMessages: env.SMTP_MAX_MESSAGES,
    connectionTimeout: env.SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: env.SMTP_TIMEOUT_MS,
    socketTimeout: env.SMTP_SOCKET_TIMEOUT_MS,
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
  };

  return nodemailer.createTransport(applyGmailTransportOverrides(transportOptions));
}

function createSingleShotTransporter(): Transporter {
  const transportOptions: SMTPTransport.Options = {
    ...GMAIL_SERVICE_CONFIG,
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    requireTLS: SMTP_REQUIRE_TLS,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: env.SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: env.SMTP_TIMEOUT_MS,
    socketTimeout: env.SMTP_SOCKET_TIMEOUT_MS,
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
  };

  return nodemailer.createTransport(applyGmailTransportOverrides(transportOptions));
}

const pooledTransporter = SHOULD_USE_POOL ? createPooledTransporter() : createSingleShotTransporter();
const singleShotTransporter = createSingleShotTransporter();
let hasVerifiedConnection = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function isTransientError(error: SMTPError): boolean {
  if (error.code && TRANSIENT_ERROR_CODES.has(error.code)) {
    return true;
  }

  if (error.responseCode && [421, 450, 451, 452].includes(error.responseCode)) {
    return true;
  }

  const response = `${error.response || ''} ${error.message || ''}`;
  return /\b4\.7\.0\b|try again later|temporary|temporarily/i.test(response);
}

function buildMessageId(): string {
  const domain = SMTP_USER.split('@')[1] || 'localhost';
  return `<${crypto.randomUUID()}@${domain}>`;
}

function sanitizeSMTPResponse(response: string | undefined): string | undefined {
  if (!response) {
    return undefined;
  }

  return response.replace(/\s+/g, ' ').slice(0, 200);
}

function buildSendMailTimeoutError(timeoutMs: number): SMTPError {
  const error = new Error(`SMTP send timed out after ${timeoutMs}ms`) as SMTPError;
  error.code = 'ETIMEDOUT';
  return error;
}

async function sendMailWithTimeout(
  transporter: Transporter,
  mailOptions: SendMailOptions,
  timeoutMs = SEND_MAIL_TIMEOUT_MS
): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(buildSendMailTimeoutError(timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function assertValidSMTPConfig(): void {
  if (!IS_GMAIL_SMTP) {
    return;
  }

  if (SMTP_PORT !== 465 && SMTP_PORT !== 587) {
    throw new Error('Gmail SMTP requires SMTP_PORT to be 465 (SSL) or 587 (STARTTLS).');
  }

  if (SMTP_PORT === 465 && !SMTP_SECURE) {
    throw new Error('Gmail SMTP on port 465 requires SMTP_SECURE=true.');
  }

  if (SMTP_PORT === 587 && !SMTP_REQUIRE_TLS) {
    throw new Error('Gmail SMTP on port 587 requires STARTTLS (requireTLS=true).');
  }

  if (!GMAIL_APP_PASSWORD_FORMAT_REGEX.test(SMTP_PASS)) {
    throw new Error(
      `Invalid Gmail App Password format. Expected 16 alphanumeric characters without spaces. Generate one at https://myaccount.google.com/security. This validation applies only when SMTP_HOST is smtp.gmail.com.`
    );
  }
}

async function verifyConnectionIfNeeded(): Promise<void> {
  if (hasVerifiedConnection) {
    return;
  }

  try {
    await pooledTransporter.verify();
    hasVerifiedConnection = true;
    console.log('SMTP transporter verification succeeded', {
      pooled: SHOULD_USE_POOL,
    });
  } catch (error) {
    const smtpError = error as SMTPError;
    console.warn('SMTP verification failed. Email send will continue with runtime fallback.', {
      errorMessage: smtpError.message,
      errorCode: smtpError.code,
      responseCode: smtpError.responseCode,
      response: sanitizeSMTPResponse(smtpError.response),
    });
  }
}

async function sendWithRetry(mailOptions: SendMailOptions): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      await verifyConnectionIfNeeded();
      await sendMailWithTimeout(pooledTransporter, mailOptions);
      return;
    } catch (pooledError) {
      const primaryError = pooledError as SMTPError;

      if (attempt === 1) {
        try {
          await sendMailWithTimeout(singleShotTransporter, mailOptions);
          return;
        } catch (fallbackError) {
          const smtpFallbackError = fallbackError as SMTPError;
          console.warn('Pooled SMTP send failed; single-shot fallback also failed.', {
            errorMessage: smtpFallbackError.message,
            errorCode: smtpFallbackError.code,
            responseCode: smtpFallbackError.responseCode,
            response: sanitizeSMTPResponse(smtpFallbackError.response),
          });
        }
      }

      if (attempt === MAX_RETRY_ATTEMPTS || !isTransientError(primaryError)) {
        // Keep the pooled transporter error because it represents the primary transport path.
        throw primaryError;
      }

      await sleep(RETRY_DELAY_MS);
    }
  }
}

async function sendTemplatedEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  assertValidSMTPConfig();

  const recipient = EMAIL_SCHEMA.parse(options.to);
  const mailOptions: SendMailOptions = {
    from: `"Axios Pay" <${SMTP_USER}>`,
    to: recipient,
    replyTo: SMTP_REPLY_TO,
    subject: options.subject,
    html: options.html,
    text: options.text ?? htmlToText(options.html),
    messageId: buildMessageId(),
    headers: {
      'X-Message-Reference-ID': crypto.randomUUID(),
    },
  };

  try {
    await sendWithRetry(mailOptions);
  } catch (error) {
    const smtpError = error as SMTPError;
    console.error('Failed to send email', {
      to: recipient,
      subject: options.subject,
      smtpHost: SMTP_HOST,
      smtpPort: SMTP_PORT,
      errorName: smtpError.name,
      errorMessage: smtpError.message,
      errorCode: smtpError.code,
      responseCode: smtpError.responseCode,
      command: smtpError.command,
      response: sanitizeSMTPResponse(smtpError.response),
      stack: smtpError.stack,
    });
    throw error;
  }
}

export async function sendEmailOTP(
  to: string,
  firstName: string,
  otp: string,
  magicToken?: string,
  userId?: string
): Promise<void> {
  const magicLink =
    magicToken && userId ? `${env.FRONTEND_URL}/verify-email?token=${magicToken}&userId=${userId}` : null;

  const subject = 'Verify your Axios Pay email';
  await sendTemplatedEmail({
    to,
    subject,
    html: `
      <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FDF8F3;">
        <h1 style="color: #1A2332; font-family: Playfair Display, serif; margin-bottom: 8px;">Axios Pay</h1>
        <p style="color: #9AA3AE; font-size: 12px; margin-bottom: 32px;">Cross-Border FX, Unlocked.</p>

        <h2 style="color: #1A2332;">Hi ${firstName}, verify your email</h2>
        <p style="color: #5A6474;">You're almost there! Verify your email to activate your Axios Pay account.</p>

        ${magicLink ? `
        <div style="margin: 32px 0;">
          <a href="${magicLink}"
             style="background: #C8772A; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
            ✓ Click to Verify Email
          </a>
        </div>` : ''}

        <p style="color: #5A6474; margin-top: 32px;">Or enter this 6-digit code manually:</p>
        <div style="background: white; border: 2px solid #E5E1DA; border-radius: 12px; padding: 24px; text-align: center; margin: 16px 0;">
          <span style="font-family: monospace; font-size: 40px; letter-spacing: 12px; color: #C8772A; font-weight: bold;">${otp}</span>
        </div>

        <p style="color: #5A6474; font-size: 14px;">This code and link expire in <strong>10 minutes</strong>.</p>
        <p style="color: #5A6474; font-size: 14px;">If you didn't create an Axios Pay account, ignore this email.</p>

        <hr style="border: none; border-top: 1px solid #E5E1DA; margin: 32px 0;">
        <p style="color: #9AA3AE; font-size: 12px;">Axios Pay — Cross-Border FX, Unlocked.</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string, firstName: string): Promise<void> {
  await sendTemplatedEmail({
    to,
    subject: 'Welcome to Axios Pay 🎉',
    html: `
      <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1A2332; font-family: Playfair Display, serif;">Axios Pay</h1>
        <h2 style="color: #1A2332;">Welcome, ${firstName}! 🎉</h2>
        <p style="color: #5A6474;">Your account is fully verified. You're ready to swap currencies across Africa.</p>
        <div style="background: #C8772A; border-radius: 8px; padding: 16px 24px; display: inline-block; margin: 24px 0;">
          <a href="${env.FRONTEND_URL}/dashboard" style="color: white; text-decoration: none; font-weight: bold;">Go to Dashboard →</a>
        </div>
        <p style="color: #5A6474;">Supported currencies: NGN, UGX, KES, GHS, ZAR</p>
        <p style="color: #5A6474;">Flat fee: 1.5% per swap. No hidden charges.</p>
        <p style="color: #9AA3AE; font-size: 12px; margin-top: 40px;">Axios Pay — Cross-Border FX, Unlocked.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetOTP(to: string, firstName: string, otp: string): Promise<void> {
  await sendTemplatedEmail({
    to,
    subject: 'Reset your Axios Pay password',
    html: `
      <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1A2332; font-family: Playfair Display, serif;">Axios Pay</h1>
        <h2 style="color: #1A2332;">Reset your password</h2>
        <p style="color: #5A6474;">Hi ${firstName}, your password reset code is:</p>
        <div style="background: #FDF3E3; border: 1px solid #E5E1DA; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-family: JetBrains Mono, monospace; font-size: 36px; letter-spacing: 8px; color: #C8772A; font-weight: bold;">${otp}</span>
        </div>
        <p style="color: #5A6474;">This code expires in 15 minutes. If you didn't request a password reset, ignore this email.</p>
        <p style="color: #9AA3AE; font-size: 12px; margin-top: 40px;">Axios Pay — Cross-Border FX, Unlocked.</p>
      </div>
    `,
  });
}

export async function sendLoginNotificationEmail(
  to: string,
  firstName: string,
  ipAddress: string | undefined,
  userAgent: string | undefined,
  loginAt: Date
): Promise<void> {
  await sendTemplatedEmail({
    to,
    subject: 'New login detected on your Axios Pay account',
    html: `
      <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1A2332; font-family: Playfair Display, serif;">Axios Pay</h1>
        <h2 style="color: #1A2332;">Hi ${firstName}, a new login was detected</h2>
        <p style="color: #5A6474;">We noticed a successful login to your account.</p>
        <div style="background: #FDF3E3; border: 1px solid #E5E1DA; border-radius: 12px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #1A2332;"><strong>Time:</strong> ${loginAt.toISOString()}</p>
          <p style="margin: 0 0 8px; color: #1A2332;"><strong>IP address:</strong> ${ipAddress || 'Unknown'}</p>
          <p style="margin: 0; color: #1A2332;"><strong>Device/Browser:</strong> ${userAgent || 'Unknown'}</p>
        </div>
        <div style="background: #C8772A; border-radius: 8px; padding: 16px 24px; display: inline-block; margin: 8px 0 24px;">
          <a href="${env.FRONTEND_URL}" style="color: white; text-decoration: none; font-weight: bold;">Not you? Secure your account immediately</a>
        </div>
        <p style="color: #9AA3AE; font-size: 12px; margin-top: 20px;">Axios Pay — Cross-Border FX, Unlocked.</p>
      </div>
    `,
  });
}

export async function sendRateProvidersOutageEmail(to: string, failureDetails: string): Promise<void> {
  await sendTemplatedEmail({
    to,
    subject: 'Axios Pay rates provider outage alert',
    html: `
      <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1A2332; font-family: Playfair Display, serif;">Axios Pay</h1>
        <h2 style="color: #1A2332;">Rates provider outage detected</h2>
        <p style="color: #5A6474;">All live FX provider attempts failed during refresh.</p>
        <div style="background: #FDF3E3; border: 1px solid #E5E1DA; border-radius: 12px; padding: 16px; margin: 24px 0;">
          <pre style="white-space: pre-wrap; margin: 0; color: #1A2332; font-family: JetBrains Mono, monospace;">${failureDetails}</pre>
        </div>
        <p style="color: #9AA3AE; font-size: 12px; margin-top: 20px;">Axios Pay — Cross-Border FX, Unlocked.</p>
      </div>
    `,
  });
}

export async function sendDepositConfirmationEmail(
  to: string,
  firstName: string,
  amount: string
): Promise<void> {
  await sendTemplatedEmail({
    to,
    subject: 'Your Axios Pay deposit was successful',
    html: `
      <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1A2332; font-family: Playfair Display, serif;">Axios Pay</h1>
        <h2 style="color: #1A2332;">Deposit successful</h2>
        <p style="color: #5A6474;">Your wallet has been credited successfully.</p>
        <div style="background: #FDF3E3; border: 1px solid #E5E1DA; border-radius: 12px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #1A2332; font-weight: bold;">Deposit of ₦${amount} successful</p>
        </div>
        <div style="background: #C8772A; border-radius: 8px; padding: 16px 24px; display: inline-block; margin: 8px 0 24px;">
          <a href="${env.FRONTEND_URL}/wallet" style="color: white; text-decoration: none; font-weight: bold;">View wallet</a>
        </div>
        <p style="color: #9AA3AE; font-size: 12px; margin-top: 20px;">Axios Pay — Cross-Border FX, Unlocked.</p>
      </div>
    `,
  });
}

export async function sendRecurringDepositFailedEmail(to: string, firstName: string): Promise<void> {
  await sendTemplatedEmail({
    to,
    subject: 'Your recurring deposit failed',
    html: `
      <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1A2332; font-family: Playfair Display, serif;">Axios Pay</h1>
        <h2 style="color: #1A2332;">Recurring deposit failed</h2>
        <p style="color: #5A6474;">Hi ${firstName}, your scheduled recurring deposit could not be processed.</p>
        <p style="color: #5A6474;">Please check your card details and try again from your dashboard.</p>
        <p style="color: #9AA3AE; font-size: 12px; margin-top: 20px;">Axios Pay — Cross-Border FX, Unlocked.</p>
      </div>
    `,
  });
}

export async function sendIdentityVerificationSuccessEmail(to: string, firstName: string): Promise<void> {
  await sendTemplatedEmail({
    to,
    subject: 'Identity verified on Axios Pay ✅',
    html: `
      <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1A2332; font-family: Playfair Display, serif;">Axios Pay</h1>
        <h2 style="color: #1A2332;">Hi ${firstName}, your identity is verified</h2>
        <p style="color: #5A6474;">Great news — your identity verification is complete.</p>
        <p style="color: #5A6474;">You now have higher limits and full platform access.</p>
        <div style="background: #C8772A; border-radius: 8px; padding: 16px 24px; display: inline-block; margin: 8px 0 24px;">
          <a href="${env.FRONTEND_URL}/profile/kyc" style="color: white; text-decoration: none; font-weight: bold;">View verification status</a>
        </div>
        <p style="color: #9AA3AE; font-size: 12px; margin-top: 20px;">Axios Pay — Cross-Border FX, Unlocked.</p>
      </div>
    `,
  });
}
