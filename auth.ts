import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getRefreshTokenExpiry } from '../lib/jwt';
import { setOTP, getOTP, deleteOTP } from '../lib/redis';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { emailService } from '../services/email.service';
import { logger } from '../lib/logger';

const router = Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
  keyGenerator: (req) => req.ip || 'unknown',
});

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/,
    'Password must have uppercase, number, and special character'),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nationality: z.string().length(2),
  residenceCountry: z.string().length(2),
});

// POST /auth/register
router.post('/register', authRateLimit, async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { phone: data.phone }] },
    });

    if (existing) {
      res.status(409).json({
        error: existing.email === data.email ? 'Email already registered' : 'Phone already registered',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          phone: data.phone,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: new Date(data.dateOfBirth),
          nationality: data.nationality,
          residenceCountry: data.residenceCountry,
        },
      });

      // Create default wallet for residence country currency
      const currencyMap: Record<string, string> = {
        NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR',
        UG: 'UGX', TZ: 'TZS', RW: 'RWF', SN: 'XOF',
      };
      const defaultCurrency = currencyMap[data.residenceCountry] || 'USD';

      await tx.wallet.create({
        data: { userId: newUser.id, currency: defaultCurrency },
      });

      return newUser;
    });

    // Generate and store email OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await setOTP(user.id, 'EMAIL_VERIFY', otp, 600);

    await emailService.sendVerificationEmail(user.email, user.firstName, otp);

    logger.info('User registered', { userId: user.id, email: user.email });

    res.status(201).json({
      message: 'Registration successful. Check your email for verification code.',
      userId: user.id,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    logger.error('Registration error', { error: err });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/verify-email
router.post('/verify-email', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { userId, otp } = z.object({
      userId: z.string(),
      otp: z.string().length(6),
    }).parse(req.body);

    const storedOTP = await getOTP(userId, 'EMAIL_VERIFY');
    if (!storedOTP || storedOTP !== otp) {
      res.status(400).json({ error: 'Invalid or expired verification code' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    await deleteOTP(userId, 'EMAIL_VERIFY');

    const sessionId = uuidv4();
    const accessToken = signAccessToken({ userId: user.id, email: user.email, kycTier: user.kycTier });
    const refreshToken = signRefreshToken(user.id, sessionId);

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken,
        expiresAt: getRefreshTokenExpiry(),
        ipAddress: req.ip,
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        kycStatus: user.kycStatus,
        kycTier: user.kycTier,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /auth/login
router.post('/login', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string(),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({ error: 'Please verify your email first', userId: user.id });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({ error: 'Account suspended. Contact support.' });
      return;
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      const tempToken = uuidv4();
      await setOTP(user.id, 'TWO_FACTOR_TEMP', tempToken, 300);
      res.json({ requires2FA: true, tempToken, userId: user.id });
      return;
    }

    const sessionId = uuidv4();
    const accessToken = signAccessToken({ userId: user.id, email: user.email, kycTier: user.kycTier });
    const refreshToken = signRefreshToken(user.id, sessionId);

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken,
        expiresAt: getRefreshTokenExpiry(),
        ipAddress: req.ip,
      },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN', resource: 'session', ipAddress: req.ip },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        kycStatus: user.kycStatus,
        kycTier: user.kycTier,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/login/2fa
router.post('/login/2fa', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { userId, tempToken, totp } = z.object({
      userId: z.string(),
      tempToken: z.string(),
      totp: z.string().length(6),
    }).parse(req.body);

    const storedTempToken = await getOTP(userId, 'TWO_FACTOR_TEMP');
    if (!storedTempToken || storedTempToken !== tempToken) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      res.status(401).json({ error: 'Invalid request' });
      return;
    }

    const isValid = authenticator.verify({ token: totp, secret: user.twoFactorSecret });
    if (!isValid) {
      res.status(401).json({ error: 'Invalid authenticator code' });
      return;
    }

    await deleteOTP(userId, 'TWO_FACTOR_TEMP');

    const sessionId = uuidv4();
    const accessToken = signAccessToken({ userId: user.id, email: user.email, kycTier: user.kycTier });
    const refreshToken = signRefreshToken(user.id, sessionId);

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken,
        expiresAt: getRefreshTokenExpiry(),
        ipAddress: req.ip,
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, kycTier: user.kycTier },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    res.status(500).json({ error: '2FA verification failed' });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const payload = verifyRefreshToken(refreshToken);

    const session = await prisma.session.findUnique({ where: { refreshToken } });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      // Possible token reuse — revoke entire user's sessions
      if (session?.userId) {
        await prisma.session.updateMany({
          where: { userId: session.userId },
          data: { isRevoked: true },
        });
      }
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Rotate refresh token
    await prisma.session.update({ where: { id: session.id }, data: { isRevoked: true } });

    const sessionId = uuidv4();
    const newAccessToken = signAccessToken({ userId: user.id, email: user.email, kycTier: user.kycTier });
    const newRefreshToken = signRefreshToken(user.id, sessionId);

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken: newRefreshToken,
        expiresAt: getRefreshTokenExpiry(),
        ipAddress: req.ip,
      },
    });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

// POST /auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    await prisma.session.updateMany({
      where: { refreshToken, userId: req.user!.userId },
      data: { isRevoked: true },
    });
    res.json({ message: 'Logged out successfully' });
  } catch {
    res.json({ message: 'Logged out' });
  }
});

// POST /auth/2fa/enable
router.post('/2fa/enable', authenticate, async (req: AuthRequest, res: Response) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(req.user!.email, 'Axios Pay', secret);
  const qrCodeDataUrl = await qrcode.toDataURL(otpauth);

  // Store secret temporarily until confirmed
  await setOTP(req.user!.userId, 'TOTP_SETUP', secret, 600);

  res.json({ qrCode: qrCodeDataUrl, secret });
});

// POST /auth/2fa/confirm
router.post('/2fa/confirm', authenticate, async (req: AuthRequest, res: Response) => {
  const { totp } = z.object({ totp: z.string().length(6) }).parse(req.body);
  const secret = await getOTP(req.user!.userId, 'TOTP_SETUP');

  if (!secret) {
    res.status(400).json({ error: '2FA setup session expired' });
    return;
  }

  const isValid = authenticator.verify({ token: totp, secret });
  if (!isValid) {
    res.status(400).json({ error: 'Invalid authenticator code' });
    return;
  }

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { twoFactorEnabled: true, twoFactorSecret: secret },
  });

  await deleteOTP(req.user!.userId, 'TOTP_SETUP');
  res.json({ message: '2FA enabled successfully' });
});

// POST /auth/forgot-password
router.post('/forgot-password', authRateLimit, async (req: Request, res: Response) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond the same to prevent enumeration
  if (user) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await setOTP(user.id, 'PASSWORD_RESET', otp, 600);
    await emailService.sendPasswordResetEmail(user.email, user.firstName, otp);
  }

  res.json({ message: 'If that email exists, a reset code has been sent.' });
});

// POST /auth/reset-password
router.post('/reset-password', authRateLimit, async (req: Request, res: Response) => {
  const { email, otp, newPassword } = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    newPassword: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/),
  }).parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const storedOTP = await getOTP(user.id, 'PASSWORD_RESET');
  if (!storedOTP || storedOTP !== otp) {
    res.status(400).json({ error: 'Invalid or expired reset code' });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await deleteOTP(user.id, 'PASSWORD_RESET');

  // Revoke all sessions
  await prisma.session.updateMany({ where: { userId: user.id }, data: { isRevoked: true } });

  res.json({ message: 'Password reset successfully. Please log in.' });
});

export default router;
