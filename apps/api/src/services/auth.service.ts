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
import { sendWelcomeEmail, sendPasswordResetOTP, sendLoginNotificationEmail } from './email.service';
import * as twoFactorService from './twoFactor.service';

const RESET_OTP_TTL = 900; // 15 minutes
const REGISTER_IDEMPOTENCY_TTL_SECONDS = 60 * 10;
const TERMS_ONBOARDING_TTL_SECONDS = 60 * 60 * 24;

const DUMMY_HASH = '$2b$12$dummyhashfortimingequalitywhenuserdoesnotexist00000000000';

export interface RegisterInput {
  email: string;
  username?: string;
  phoneNumber: string;
  identity?: string;
  password: string;
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
  onboardingToken: string;
  message: string;
  requiresTermsAcceptance: true;
}> {
  const idempotencyKey = context?.idempotencyKey?.trim();
  const idempotencyCacheKey = idempotencyKey ? `idempotency:register:${idempotencyKey}` : null;
  if (idempotencyCacheKey) {
    const cachedResponse = await redis.get(idempotencyCacheKey);
    if (cachedResponse) {
      try {
        return JSON.parse(cachedResponse) as {
          userId: string;
          onboardingToken: string;
          message: string;
          requiresTermsAcceptance: true;
        };
      } catch {
        await redis.del(idempotencyCacheKey);
      }
    }
  }

  try {
    const normalizedEmail = input.email.trim().toLowerCase();
    
    // Auto-generate username if not provided
    let usernameToUse = input.username?.trim();
    if (!usernameToUse) {
      // Extract name from email (part before @)
      const emailPrefix = normalizedEmail.split('@')[0];
      const timestamp = Date.now() % 10000; // 4-digit random suffix
      usernameToUse = `${emailPrefix}_${timestamp}`;
    }
    
    const normalizedUsername = normalizeUsername(usernameToUse);
    const normalizedPhoneNumber = normalizePhoneNumber(input.phoneNumber);
    const identity = (input.identity ?? '').trim();
    const { firstName, lastName } = deriveNameFromUsername(normalizedUsername);
    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.$transaction(
      async (tx) => {
        const existingUser = await tx.user.findFirst({
          where: {
            OR: [
              { email: normalizedEmail },
              { username: normalizedUsername },
              { phoneNumber: normalizedPhoneNumber },
            ],
          },
          select: { email: true, username: true, phoneNumber: true },
        });

        if (existingUser?.email === normalizedEmail) {
          throw new Error('EMAIL_EXISTS');
        }
        if (existingUser?.username === normalizedUsername) {
          throw new Error('USERNAME_EXISTS');
        }
        if (existingUser?.phoneNumber === normalizedPhoneNumber) {
          throw new Error('PHONE_EXISTS');
        }

        return tx.user.create({
          data: {
            email: normalizedEmail,
            username: normalizedUsername,
            phoneNumber: normalizedPhoneNumber,
            identity,
            passwordHash,
            firstName,
            lastName,
            nationality: deriveNationalityFromPhoneNumber(normalizedPhoneNumber),
            wallets: {
              create: [{ currency: 'NGN', balance: 0 }],
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    sendWelcomeEmail(user.email, user.firstName).catch((error) => {
      console.warn('Welcome email task failed unexpectedly', {
        userId: user.id,
        reason: error instanceof Error ? error.message : String(error),
      });
    });

    // 48-char token provides high entropy while remaining URL-safe for onboarding redirects.
    const onboardingToken = nanoid(48);
    await redis.set(`terms:onboarding:${onboardingToken}`, user.id, "EX", TERMS_ONBOARDING_TTL_SECONDS);

    const response = {
      userId: user.id,
      onboardingToken,
      message: 'Registration successful. Please review and accept the Terms and Conditions.',
      requiresTermsAcceptance: true as const,
    };

    if (idempotencyCacheKey) {
      await redis.set(idempotencyCacheKey, JSON.stringify(response), 'EX', REGISTER_IDEMPOTENCY_TTL_SECONDS);
    }
    return response;
  } catch (error) {
    const mappedErrorCode = mapRegisterErrorCode(error);
    if (mappedErrorCode) {
      if (!['EMAIL_EXISTS', 'USERNAME_EXISTS', 'PHONE_EXISTS'].includes(mappedErrorCode)) {
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

export async function acceptTerms(onboardingToken: string, accepted: boolean): Promise<void> {
  if (!accepted) {
    throw new Error('TERMS_NOT_ACCEPTED');
  }

  const userId = await redis.get(`terms:onboarding:${onboardingToken}`);
  if (!userId) {
    throw new Error('TERMS_ACCEPTANCE_SESSION_INVALID');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
  });

  await redis.del(`terms:onboarding:${onboardingToken}`);
}

export interface KYCOnboardingInput {
  onboardingToken: string;
  nationality: string;
  idNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

export async function submitKYCOnboarding(input: KYCOnboardingInput): Promise<void> {
  const userId = await redis.get(`terms:onboarding:${input.onboardingToken}`);
  if (!userId) {
    throw new Error('KYC_SESSION_INVALID');
  }

  // Update user with KYC info
  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      nationality: input.nationality.trim(),
      identity: input.idNumber.trim(),
    },
  });

  // Clear the onboarding token after KYC submission
  await redis.del(`terms:onboarding:${input.onboardingToken}`);
}

export interface LoginInput {
  identifier: string; // username or phone number
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
  const normalizedIdentifier = input.identifier.trim();
  const normalizedUsername = normalizeUsername(normalizedIdentifier);
  const normalizedPhoneNumber = tryNormalizePhoneNumber(normalizedIdentifier);

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: normalizedUsername },
        ...(normalizedPhoneNumber ? [{ phoneNumber: normalizedPhoneNumber }] : []),
      ],
    },
    include: { wallets: true },
  });

  if (!user) {
    await bcrypt.compare(input.password, DUMMY_HASH);
    throw new Error('INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  if (!user.termsAccepted) throw new Error('TERMS_NOT_ACCEPTED');

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

function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhoneNumber(value: string): string {
  const compact = value.replace(/[\s()-]/g, '');
  if (!/^\+[1-9]\d{6,14}$/.test(compact)) {
    throw new Error('INVALID_PHONE_NUMBER');
  }
  return compact;
}

function tryNormalizePhoneNumber(value: string): string | null {
  try {
    return normalizePhoneNumber(value);
  } catch {
    return null;
  }
}


function deriveNameFromUsername(username: string): { firstName: string; lastName: string } {
  const segments = username.split(/[._-]+/).filter(Boolean);
  const firstName = formatNameSegment(segments[0] || 'User');
  const lastName = formatNameSegment(segments[1] || 'Member');
  return { firstName, lastName };
}

function formatNameSegment(value: string): string {
  const safeValue = value.replace(/[^a-zA-Z0-9]/g, '');
  const normalized = safeValue || 'User';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

function deriveNationalityFromPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.startsWith('+234')) return 'NG';
  if (phoneNumber.startsWith('+256')) return 'UG';
  if (phoneNumber.startsWith('+254')) return 'KE';
  if (phoneNumber.startsWith('+233')) return 'GH';
  if (phoneNumber.startsWith('+27')) return 'ZA';

  throw new Error('UNSUPPORTED_PHONE_COUNTRY');
}

function mapRegisterErrorCode(error: unknown): string | null {
  if (error instanceof Error && ['EMAIL_EXISTS', 'USERNAME_EXISTS', 'PHONE_EXISTS', 'INVALID_PHONE_NUMBER', 'UNSUPPORTED_PHONE_COUNTRY'].includes(error.message)) {
    return error.message;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    const target = Array.isArray(error.meta?.target) ? error.meta?.target.map(String) : [];
    if (target.includes('email')) return 'EMAIL_EXISTS';
    if (target.includes('username')) return 'USERNAME_EXISTS';
    if (target.includes('phone')) return 'PHONE_EXISTS';
    return 'DUPLICATE_RESOURCE';
  }

  const pgError = error as { code?: string; detail?: string; constraint?: string };
  if (pgError?.code === '23505') {
    const detail = `${pgError.detail || ''} ${pgError.constraint || ''}`.toLowerCase();
    if (detail.includes('email')) return 'EMAIL_EXISTS';
    if (detail.includes('username')) return 'USERNAME_EXISTS';
    if (detail.includes('phone')) return 'PHONE_EXISTS';
    return 'DUPLICATE_RESOURCE';
  }

  return null;
}
