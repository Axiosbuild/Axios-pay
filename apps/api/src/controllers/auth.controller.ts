import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import type { RegisterInput } from '../services/auth.service';

const registerSchema: z.ZodType<RegisterInput> = z.object({
  email: z.string().email(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,28}[a-zA-Z0-9])?$/, 'Username must start/end with a letter or number.')
    .optional(),
  phoneNumber: z.string().regex(/^\+[1-9]\d{6,14}$/),
  identity: z.string().trim().min(2).max(120).optional(),
  password: z.string().min(8),
});

const acceptTermsSchema = z.object({
  onboardingToken: z.string().min(1),
  accepted: z.boolean(),
});

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8),
});

const verify2FASchema = z.object({
  tempToken: z.string().min(1),
  token: z.string().length(6),
});

const kycOnboardingSchema = z.object({
  onboardingToken: z.string().min(1),
  nationality: z.string().regex(/^[A-Z]{2}$/, 'Invalid country code'),
  idNumber: z.string().min(1, 'ID number is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Normalize request body to handle both old and new formats
    const normalizedBody = normalizeRegisterPayload(req.body);
    
    const data = registerSchema.parse(normalizedBody);
    const requestIdHeader = req.headers['x-request-id'];
    const vercelIdHeader = req.headers['x-vercel-id'];
    const idempotencyHeader = req.headers['x-idempotency-key'];
    const requestId = Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader;
    const vercelId = Array.isArray(vercelIdHeader) ? vercelIdHeader[0] : vercelIdHeader;
    const idempotencyKey = Array.isArray(idempotencyHeader) ? idempotencyHeader[0] : idempotencyHeader;

    const result = await authService.register(data, { requestId, vercelId, idempotencyKey });
    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        userId: result.userId,
        requiresTermsAcceptance: result.requiresTermsAcceptance,
        onboardingToken: result.onboardingToken,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function acceptTerms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { onboardingToken, accepted } = acceptTermsSchema.parse(req.body);
    await authService.acceptTerms(onboardingToken, accepted);
    res.json({
      success: true,
      message: 'Terms and Conditions accepted successfully.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function submitKYCOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = kycOnboardingSchema.parse(req.body);
    await authService.submitKYCOnboarding(data);
    res.json({
      success: true,
      message: 'Identity information collected successfully. You can now sign in.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login({
      identifier: data.identifier,
      password: data.password,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refresh(refreshToken);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    await authService.logout(refreshToken);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);
    res.json({ message: 'If that email exists, a reset code has been sent.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(data.email, data.otp, data.newPassword);
    res.json({ message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function verify2FALogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = verify2FASchema.parse(req.body);
    const result = await authService.verify2FALogin(
      data.tempToken,
      data.token,
      req.headers['user-agent'],
      req.ip
    );
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

/**
 * Normalize register payload to handle both old format (countryCode + localPhone)
 * and new format (phoneNumber). Also provides default for optional identity field.
 */
function normalizeRegisterPayload(body: unknown): unknown {
  const payload = body as Record<string, unknown>;
  
  // Combine countryCode + localPhone into phoneNumber if using old format
  if ((payload.countryCode || payload.localPhone) && !payload.phoneNumber) {
    const countryCode = String(payload.countryCode || '+234').trim();
    const localPhone = String(payload.localPhone || '').trim();
    payload.phoneNumber = `${countryCode}${localPhone}`;
  }
  
  // Provide sensible default for identity if not provided
  if (!payload.identity) {
    payload.identity = 'unverified';
  }
  
  return payload;
}
