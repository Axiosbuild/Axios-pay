import crypto from 'crypto';
import { z } from 'zod';

const generatedAccessSecret = crypto.randomBytes(32).toString('hex');
const generatedRefreshSecret = crypto.randomBytes(32).toString('hex');
const generatedWebhookSecret = crypto.randomBytes(32).toString('hex');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6379'),
  JWT_ACCESS_SECRET: z.string().min(32).default(generatedAccessSecret),
  JWT_REFRESH_SECRET: z.string().min(32).default(generatedRefreshSecret),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY_DAYS: z.coerce.number().default(30),
  BASE_URL: z.string().url().default('https://api-gateway.interswitchng.com'),
  INTERSWITCH_BASE_URL: z.string().url().optional(),
  INTERSWITCH_PASSPORT_URL: z.string().url().default('https://example.invalid'),
  INTERSWITCH_CLIENT_ID: z.string().min(1).default('placeholder-client-id'),
  INTERSWITCH_CLIENT_SECRET: z.string().min(1).default('placeholder-client-secret'),
  INTERSWITCH_MERCHANT_CODE: z.string().min(1).default('placeholder-merchant-code'),
  INTERSWITCH_PAY_ITEM_ID: z.string().min(1).default('placeholder-pay-item-id'),
  NEXT_PUBLIC_INTERSWITCH_MERCHANT_CODE: z.string().min(1).default('placeholder-merchant-code'),
  NEXT_PUBLIC_INTERSWITCH_PAY_ITEM_ID: z.string().min(1).default('placeholder-pay-item-id'),
  INTERSWITCH_WEBHOOK_SECRET: z.string().min(1).default(generatedWebhookSecret),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().refine((value) => value === 465 || value === 587, {
    message: 'SMTP_PORT must be 465 (SSL) or 587 (STARTTLS).',
  }).default(465),
  SMTP_SECURE: z.coerce.boolean().default(true),
  SMTP_USER: z.string().email().default('axiosbuild@gmail.com'),
  SMTP_PASS: z.string().min(1).default('placeholder-smtp-pass'),
  SMTP_REPLY_TO: z.string().email().optional(),
  SMTP_POOL: z.coerce.boolean().default(true),
  SMTP_MAX_CONNECTIONS: z.coerce.number().int().min(1).max(20).default(5),
  SMTP_MAX_MESSAGES: z.coerce.number().int().min(1).max(500).default(100),
  SMTP_TIMEOUT_MS: z.coerce.number().int().min(5000).default(10000), // SMTP greeting timeout (server hello)
  SMTP_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(1000).default(5000), // TCP connect timeout
  SMTP_SOCKET_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000), // socket inactivity timeout
  TWILIO_ACCOUNT_SID: z.string().min(1).default('placeholder-twilio-sid'),
  TWILIO_AUTH_TOKEN: z.string().min(1).default('placeholder-twilio-token'),
  TWILIO_PHONE_NUMBER: z.string().min(1).default('placeholder-twilio-number'),
  FRONTEND_URL: z
    .string()
    .url()
    .default('http://localhost:3000')
    .transform((value) => new URL(value).origin),
  ENCRYPTION_KEY: z.string().min(32).default(crypto.randomBytes(32).toString('hex')),
  CRON_ENABLED: z.coerce.boolean().default(true),
  ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  EXCHANGE_RATE_API_KEY: z.string().optional(),
  RATE_REFRESH_INTERVAL_MS: z.coerce.number().default(600000),
  RATE_SPREAD_PERCENT: z.coerce.number().default(0.3),
  DOJAH_APP_ID: z.string().optional(),
  DOJAH_SECRET_KEY: z.string().optional(),
  SMILE_IDENTITY_PARTNER_ID: z.string().optional(),
  SMILE_IDENTITY_API_KEY: z.string().optional(),
  SMILE_IDENTITY_SID_SERVER: z.string().default('0'),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('❌ Invalid environment variables:');
  const errors = result.error.flatten().fieldErrors;
  Object.entries(errors).forEach(([key, messages]) => {
    console.error(`  ${key}: ${messages?.join(', ')}`);
  });
  process.exit(1);
}

const defaultedKeys = [
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'BASE_URL',
  'INTERSWITCH_BASE_URL',
  'INTERSWITCH_PASSPORT_URL',
  'INTERSWITCH_CLIENT_ID',
  'INTERSWITCH_CLIENT_SECRET',
  'INTERSWITCH_MERCHANT_CODE',
  'INTERSWITCH_PAY_ITEM_ID',
  'NEXT_PUBLIC_INTERSWITCH_MERCHANT_CODE',
  'NEXT_PUBLIC_INTERSWITCH_PAY_ITEM_ID',
  'INTERSWITCH_WEBHOOK_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_PASS',
  'SMTP_REPLY_TO',
  'SMTP_POOL',
  'SMTP_MAX_CONNECTIONS',
  'SMTP_MAX_MESSAGES',
  'SMTP_TIMEOUT_MS',
  'SMTP_CONNECTION_TIMEOUT_MS',
  'SMTP_SOCKET_TIMEOUT_MS',
  'ENCRYPTION_KEY',
  'ADMIN_EMAIL',
  'EXCHANGE_RATE_API_KEY',
  'DOJAH_APP_ID',
  'DOJAH_SECRET_KEY',
  'SMILE_IDENTITY_PARTNER_ID',
  'SMILE_IDENTITY_API_KEY',
  'SMILE_IDENTITY_SID_SERVER',
] as const;

const missingKeys = defaultedKeys.filter((key) => !process.env[key]);
if (missingKeys.length > 0) {
  console.warn(
    `⚠️ Missing optional environment variables. Using safe defaults for: ${missingKeys.join(', ')}`
  );
}

const normalizedEnv = {
  ...result.data,
  // BASE_URL is kept for requested .env compatibility, while INTERSWITCH_BASE_URL
  // is the canonical key consumed by services in this codebase.
  INTERSWITCH_BASE_URL: result.data.INTERSWITCH_BASE_URL || result.data.BASE_URL,
};

export const env = normalizedEnv;
export type Env = typeof env;
