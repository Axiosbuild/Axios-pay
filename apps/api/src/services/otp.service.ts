import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';

function toExpiryDate(ttlSeconds: number): Date {
  return new Date(Date.now() + ttlSeconds * 1000);
}

async function upsertVerificationValue(key: string, value: string, ttlSeconds: number): Promise<void> {
  await prisma.verificationCode.upsert({
    where: { key },
    update: {
      value,
      expiresAt: toExpiryDate(ttlSeconds),
    },
    create: {
      key,
      value,
      expiresAt: toExpiryDate(ttlSeconds),
    },
  });
}

async function readVerificationValueFromDb(key: string): Promise<string | null> {
  const record = await prisma.verificationCode.findUnique({
    where: { key },
    select: { value: true, expiresAt: true },
  });

  if (!record) return null;
  if (record.expiresAt <= new Date()) {
    await prisma.verificationCode.deleteMany({ where: { key } });
    return null;
  }

  return record.value;
}

function hasAtLeastOneSuccess(results: PromiseSettledResult<unknown>[]): boolean {
  return results.some((result) => result.status === 'fulfilled');
}

function firstRejectionReason(results: PromiseSettledResult<unknown>[]): unknown {
  return results.find((result): result is PromiseRejectedResult => result.status === 'rejected')?.reason;
}

export async function storeVerificationValue(key: string, value: string, ttlSeconds: number): Promise<void> {
  const results = await Promise.allSettled([
    redis.set(key, value, 'EX', ttlSeconds),
    upsertVerificationValue(key, value, ttlSeconds),
  ]);

  if (!hasAtLeastOneSuccess(results)) {
    throw firstRejectionReason(results) ?? new Error('VERIFICATION_STORE_UNAVAILABLE');
  }
}

export async function getVerificationValue(key: string): Promise<string | null> {
  try {
    const cached = await redis.get(key);
    if (cached !== null) return cached;
  } catch {
    // Redis is optional for verification artifacts because Postgres is the source of truth.
  }

  return readVerificationValueFromDb(key);
}

export async function deleteVerificationValue(key: string): Promise<void> {
  await Promise.allSettled([
    redis.del(key),
    prisma.verificationCode.deleteMany({ where: { key } }),
  ]);
}

export function generateOTP(): string {
  const bytes = crypto.randomBytes(3);
  const num = parseInt(bytes.toString('hex'), 16) % 1000000;
  return num.toString().padStart(6, '0');
}

export async function storeOTP(key: string, otp: string, ttlSeconds: number): Promise<void> {
  await storeVerificationValue(`otp:${key}`, otp, ttlSeconds);
}

export async function verifyOTP(key: string, otp: string): Promise<void> {
  const otpKey = `otp:${key}`;
  const stored = await getVerificationValue(otpKey);
  if (!stored) {
    throw new Error('OTP_EXPIRED');
  }
  if (stored !== otp) {
    throw new Error('OTP_INVALID');
  }
  await deleteVerificationValue(otpKey);
}
