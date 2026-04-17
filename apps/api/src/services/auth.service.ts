import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { env } from '../config/env';
import {
  deleteVerificationValue,
  generateOTP,
  getVerificationValue,
  storeOTP,
  storeVerificationValue,
  verifyOTP,
} from './otp.service';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetOTP, sendLoginNotificationEmail } from './email.service';
import * as twoFactorService from './twoFactor.service';
import {
  buildVerificationExpiry,
  generateVerificationCode,
  generateVerificationToken,
  hashVerificationValue,
} from '../utils/verification';

const NATIONALITY_CURRENCY_MAP: Record<string, string> = {
  NG: 'NGN',
  UG: 'UGX',
  KE: 'KES',
  GH: 'GHS',
  ZA: 'ZAR',
};

const RESET_OTP_TTL = 900; // 15 minutes
const REGISTER_IDEMPOTENCY_TTL_SECONDS = 60 * 10;

const DUMMY_HASH = '$2b$12$dummyhashfortimingequalitywhenuserdoesnotexist00000000000';

export interface RegisterInput {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  nationality: string;
  nationalId?: string;
}

interface RegisterContext {
  requestId?: string;
  vercelId?: string;
  idempotencyKey?: string;
}

export async function register(
  input: RegisterInput,
  context?: RegisterContext
): Promise<{
  userId: string;
  message: string;
  requiresVerification: true;
  emailDelivery: 'sent';
  emailSent: true;
}> {
  const idempotencyKey = context?.idempotencyKey?.trim();
  const idempotencyCacheKey = idempotencyKey ? `idempotency:register:${idempotencyKey}` : null;
  if (idempotencyCacheKey) {
    const cachedResponse = await redis.get(idempotencyCacheKey);
    if (cachedResponse) {
      try {
        return JSON.parse(cachedResponse) as {
          userId: string;
          message: string;
          requiresVerification: true;
          emailDelivery: 'sent';
          emailSent: true;
        };
      } catch {
        await redis.del(idempotencyCacheKey);
      }
    }
  }

  try {
    const normalizedEmail = input.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(input.password, 12);
    const nativeCurrency = NATIONALITY_CURRENCY_MAP[input.nationality.toUpperCase()];

    const user = await prisma.$transaction(
      async (tx) => {
        const existingUser = await tx.user.findFirst({
          where: {
              OR: [
                { email: normalizedEmail },
                { phone: input.phone },
                ...(input.nationalId ? [{ nationalIdNumber: input.nationalId }] : []),
              ],
          },
          select: { email: true, phone: true, nationalIdNumber: true },
        });

        if (existingUser?.email === normalizedEmail) {
          throw new Error('EMAIL_EXISTS');
        }
        if (existingUser?.phone === input.phone) {
          throw new Error('PHONE_EXISTS');
        }
        if (input.nationalId && existingUser?.nationalIdNumber === input.nationalId) {
          throw new Error('NATIONAL_ID_EXISTS');
        }

        return tx.user.create({
          data: {
            email: normalizedEmail,
            phone: input.phone,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            nationality: input.nationality.toUpperCase(),
            nationalIdNumber: input.nationalId,
            wallets: {
              create: [
                { currency: 'NGN', balance: 0 },
                ...(nativeCurrency && nativeCurrency !== 'NGN'
                  ? [{ currency: nativeCurrency, balance: 0 }]
                  : []),
              ],
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    const verificationToken = generateVerificationToken();
    const verificationCode = generateVerificationCode();
    const verificationExpiry = buildVerificationExpiry(env.VERIFICATION_TOKEN_TTL_MINUTES);
    const verificationTokenHash = hashVerificationValue(verificationToken);
    const verificationCodeHash = hashVerificationValue(verificationCode);
    const verificationLink = `${env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationTokenHash,
        verificationCodeHash,
        verificationCodeExpiry: verificationExpiry,
      },
    });

    const emailDelivery = await sendRegistrationVerificationEmail(
      user.id,
      user.email,
      user.firstName,
      verificationCode,
      verificationLink,
      context
    );

    const response = {
      userId: user.id,
      message: 'Verification email sent.',
      requiresVerification: true as const,
      emailDelivery,
      emailSent: true as const,
    };
    if (idempotencyCacheKey) {
      await redis.set(idempotencyCacheKey, JSON.stringify(response), 'EX', REGISTER_IDEMPOTENCY_TTL_SECONDS);
    }
    return response;
  } catch (error) {
    const mappedErrorCode = mapRegisterErrorCode(error);
    if (mappedErrorCode) {
      if (!['EMAIL_EXISTS', 'PHONE_EXISTS', 'NATIONAL_ID_EXISTS'].includes(mappedErrorCode)) {
        console.error('Registration failed with handled database error', {
          errorCode: mappedErrorCode,
          requestId: context?.requestId,
          vercelId: context?.vercelId,
        });
      }
      throw new Error(mappedErrorCode);
    }

    const unknownError = error as Error;
    console.error('Registration failed with unhandled error', {
      requestId: context?.requestId,
      vercelId: context?.vercelId,
      message: unknownError.message,
      stack: unknownError.stack,
    });
    throw error;
  }
}

export async function verifyEmail(input: {
  token?: string;
  email?: string;
  code?: string;
  userId?: string;
  otp?: string;
}): Promise<{ verified: boolean; userId: string; alreadyVerified?: boolean }> {
  if (input.token) {
    return verifyEmailByToken(input.token);
  }

  if (input.email && input.code) {
    return verifyEmailByCode(input.email, input.code);
  }

  if (input.userId && input.otp) {
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new Error('USER_NOT_FOUND');
    return verifyEmailByCode(user.email, input.otp);
  }

  throw new Error('INVALID_PARAMETERS');
}

export async function verifyEmailLink(
  userId: string,
  token: string
): Promise<{ verified: boolean; userId: string; alreadyVerified?: boolean }> {
  const result = await verifyEmailByToken(token);
  if (result.userId !== userId) {
    throw new Error('INVALID_TOKEN');
  }
  return result;
}

export async function verifyPhone(userId: string, otp: string): Promise<{ verified: boolean }> {
  await verifyOTP(`phone:${userId}`, otp);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');

  await prisma.user.update({
    where: { id: userId },
    data: { isPhoneVerified: true },
  });

  await sendWelcomeEmail(user.email, user.firstName);

  return { verified: true };
}

export interface LoginInput {
  identifier: string; // email or phone
  password: string;
  userAgent?: string;
  ipAddress?: string;
}

export async function login(input: LoginInput): Promise<{
  accessToken?: string;
  refreshToken?: string;
  user?: object;
  requires2FA?: boolean;
  tempToken?: string;
}> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.identifier }, { phone: input.identifier }],
    },
    include: { wallets: true },
  });

  if (!user) {
    await bcrypt.compare(input.password, DUMMY_HASH);
    throw new Error('INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  if (!user.isEmailVerified) throw new Error('EMAIL_NOT_VERIFIED');

  if (user.isFrozen) throw new Error('ACCOUNT_FROZEN');

  if (user.isTwoFactorEnabled) {
    const tempToken = nanoid(48);
    await redis.set(`2fa-login:${tempToken}`, user.id, 'EX', 300);
    return { requires2FA: true, tempToken };
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = nanoid(64);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.JWT_REFRESH_EXPIRY_DAYS);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      expiresAt,
    },
  });

  const { passwordHash: _, transactionPin: __, twoFactorSecret: ___, ...userWithoutHash } = user;

  await sendLoginNotificationEmail(
    user.email,
    user.firstName,
    input.ipAddress,
    input.userAgent,
    new Date()
  );

  return { accessToken, refreshToken, user: userWithoutHash };
}

export async function verify2FALogin(
  tempToken: string,
  token: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ accessToken: string; refreshToken: string; user: object }> {
  const userId = await redis.get(`2fa-login:${tempToken}`);
  if (!userId) throw new Error('TWO_FACTOR_TEMP_TOKEN_INVALID');

  const isValid = await twoFactorService.verifyToken(userId, token);
  if (!isValid) throw new Error('TWO_FACTOR_INVALID');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallets: true },
  });
  if (!user) throw new Error('USER_NOT_FOUND');

  const accessToken = signAccessToken(user.id);
  const refreshToken = nanoid(64);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.JWT_REFRESH_EXPIRY_DAYS);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      userAgent,
      ipAddress,
      expiresAt,
    },
  });

  await redis.del(`2fa-login:${tempToken}`);

  const { passwordHash: _, transactionPin: __, twoFactorSecret: ___, ...userWithoutHash } = user;

  await sendLoginNotificationEmail(
    user.email,
    user.firstName,
    ipAddress,
    userAgent,
    new Date()
  );

  return { accessToken, refreshToken, user: userWithoutHash };
}

export async function refresh(token: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const session = await prisma.session.findUnique({
    where: { refreshToken: token },
  });

  if (!session) throw new Error('SESSION_NOT_FOUND');
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    throw new Error('SESSION_EXPIRED');
  }

  const newRefreshToken = nanoid(64);
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + env.JWT_REFRESH_EXPIRY_DAYS);

  await prisma.session.update({
    where: { id: session.id },
    data: { refreshToken: newRefreshToken, expiresAt: newExpiresAt },
  });

  const accessToken = signAccessToken(session.userId);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { refreshToken: token } });
}

export async function forgotPassword(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) return; // Don't reveal if user exists

  const otp = generateOTP();
  await storeOTP(`reset:${user.id}`, otp, RESET_OTP_TTL);
  await storeVerificationValue(`reset-email:${normalizedEmail}`, user.id, RESET_OTP_TTL);

  await sendPasswordResetOTP(user.email, user.firstName, otp);
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const userId = await getVerificationValue(`reset-email:${normalizedEmail}`);
  if (!userId) throw new Error('OTP_EXPIRED');

  await verifyOTP(`reset:${userId}`, otp);

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);

  await deleteVerificationValue(`reset-email:${normalizedEmail}`);
}

export async function resendOTP(input: { userId?: string; email?: string }): Promise<{ userId: string }> {
  const user = input.userId
    ? await prisma.user.findUnique({ where: { id: input.userId } })
    : input.email
      ? await prisma.user.findUnique({ where: { email: input.email } })
      : null;

  if (!user) throw new Error('USER_NOT_FOUND');
  if (user.isEmailVerified) throw new Error('EMAIL_ALREADY_VERIFIED');

  const verificationToken = generateVerificationToken();
  const verificationCode = generateVerificationCode();
  const verificationExpiry = buildVerificationExpiry(env.VERIFICATION_TOKEN_TTL_MINUTES);
  const verificationLink = `${env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationTokenHash: hashVerificationValue(verificationToken),
      verificationCodeHash: hashVerificationValue(verificationCode),
      verificationCodeExpiry: verificationExpiry,
    },
  });

  try {
    await sendVerificationEmail(user.email, user.firstName, verificationCode, verificationLink);
    console.log('Resend verification email sent', { userId: user.id });
  } catch (error) {
    const sendFailureError = new Error('VERIFICATION_EMAIL_SEND_FAILED');
    if (error instanceof Error) {
      sendFailureError.cause = error;
    }
    throw sendFailureError;
  }

  return { userId: user.id };
}

export async function resendVerification(input: { userId?: string; email?: string }): Promise<{ userId: string }> {
  return resendOTP(input);
}

// POST /api/v1/auth/send-verification — resend by email
export async function sendVerification(email: string): Promise<{ message: string; userId: string }> {
  const { userId } = await resendOTP({ email });
  return { message: 'Verification email sent', userId };
}

// POST /api/v1/auth/verify-code — verify 6-digit code by email
export async function verifyCode(email: string, code: string): Promise<{ verified: boolean }> {
  const result = await verifyEmailByCode(email, code);
  return { verified: result.verified };
}

// POST /api/v1/auth/verify-email-token — verify opaque token from email link
export async function verifyEmailToken(token: string): Promise<{ verified: boolean; userId: string }> {
  const result = await verifyEmailByToken(token);
  return { verified: result.verified, userId: result.userId };
}

async function verifyEmailByToken(token: string): Promise<{ verified: boolean; userId: string; alreadyVerified?: boolean }> {
  const tokenHash = hashVerificationValue(token);
  const user = await prisma.user.findFirst({
    where: { verificationTokenHash: tokenHash },
  });

  if (!user) {
    throw new Error('INVALID_TOKEN');
  }

  if (user.isEmailVerified) {
    return { verified: true, userId: user.id, alreadyVerified: true };
  }

  if (!user.verificationCodeExpiry || user.verificationCodeExpiry < new Date()) {
    throw new Error('INVALID_TOKEN');
  }

  await markEmailVerified(user.id, user.email, user.firstName);
  return { verified: true, userId: user.id };
}

async function verifyEmailByCode(
  email: string,
  code: string
): Promise<{ verified: boolean; userId: string; alreadyVerified?: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) throw new Error('USER_NOT_FOUND');
  if (user.isEmailVerified) {
    return { verified: true, userId: user.id, alreadyVerified: true };
  }

  if (!user.verificationCodeHash || !user.verificationCodeExpiry) {
    throw new Error('OTP_EXPIRED');
  }

  if (user.verificationCodeExpiry < new Date()) {
    throw new Error('OTP_EXPIRED');
  }

  if (hashVerificationValue(code) !== user.verificationCodeHash) {
    throw new Error('OTP_INVALID');
  }

  await markEmailVerified(user.id, user.email, user.firstName);
  return { verified: true, userId: user.id };
}

async function markEmailVerified(userId: string, email: string, firstName: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isEmailVerified: true,
      isPhoneVerified: true,
      verificationTokenHash: null,
      verificationCodeHash: null,
      verificationCodeExpiry: null,
    },
  });

  await deleteVerificationValue(`otp:email:${userId}`);
  await sendWelcomeEmail(email, firstName);
}

async function sendRegistrationVerificationEmail(
  userId: string,
  email: string,
  firstName: string,
  otp: string,
  verificationLink: string,
  context?: RegisterContext
): Promise<'sent'> {
  try {
    await sendVerificationEmail(email, firstName, otp, verificationLink);
    console.log('Registration verification email sent', {
      userId,
      requestId: context?.requestId,
      vercelId: context?.vercelId,
    });
    return 'sent';
  } catch (error) {
    console.warn('Registration verification email failed', {
      userId,
      requestId: context?.requestId,
      vercelId: context?.vercelId,
      reason: error instanceof Error ? error.message : String(error),
    });
    const sendFailureError = new Error('VERIFICATION_EMAIL_SEND_FAILED');
    if (error instanceof Error) {
      sendFailureError.cause = error;
    }
    throw sendFailureError;
  }
}

function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);
}

function mapRegisterErrorCode(error: unknown): string | null {
  if (error instanceof Error && ['EMAIL_EXISTS', 'PHONE_EXISTS', 'NATIONAL_ID_EXISTS'].includes(error.message)) {
    return error.message;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    const target = Array.isArray(error.meta?.target) ? error.meta?.target.map(String) : [];
    if (target.includes('email')) return 'EMAIL_EXISTS';
    if (target.includes('phone')) return 'PHONE_EXISTS';
    if (target.includes('nationalIdNumber')) return 'NATIONAL_ID_EXISTS';
    return 'DUPLICATE_RESOURCE';
  }

  const pgError = error as { code?: string; detail?: string; constraint?: string };
  if (pgError?.code === '23505') {
    const detail = `${pgError.detail || ''} ${pgError.constraint || ''}`.toLowerCase();
    if (detail.includes('email')) return 'EMAIL_EXISTS';
    if (detail.includes('phone')) return 'PHONE_EXISTS';
    if (detail.includes('nationalidnumber') || detail.includes('national id')) return 'NATIONAL_ID_EXISTS';
    return 'DUPLICATE_RESOURCE';
  }

  return null;
}
