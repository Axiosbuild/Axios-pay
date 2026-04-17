import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import type { RegisterInput } from '../services/auth.service';

const registerSchema: z.ZodType<RegisterInput> = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  nationality: z.enum(['NG', 'UG', 'KE', 'GH', 'ZA']),
  nationalId: z.string().min(1).optional(),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1).optional(),
  email: z.string().email().optional(),
  code: z.string().length(6).optional(),
  userId: z.string().min(1).optional(),
  otp: z.string().length(6).optional(),
}).superRefine((value, ctx) => {
  if (value.token) return;
  if (value.email && value.code) return;
  if (value.userId && value.otp) return;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: 'Provide token OR email+code OR userId+otp.',
  });
});

const verifyPhoneSchema = z.object({
  userId: z.string().min(1),
  otp: z.string().length(6),
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

const resendOTPSchema = z.object({
  userId: z.string().min(1).optional(),
  email: z.string().email().optional(),
}).refine((data) => Boolean(data.userId || data.email), {
  message: 'Provide userId or email to resend verification',
});

const verifyEmailLinkSchema = z.object({
  token: z.string().min(1),
  userId: z.string().min(1),
});

const sendVerificationSchema = z.object({
  email: z.string().email(),
});

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const verifyEmailTokenSchema = z.object({
  token: z.string().min(1),
});
const verifyEmailTokenQuerySchema = z.object({
  token: z.string().min(1),
});

const verify2FASchema = z.object({
  tempToken: z.string().min(1),
  token: z.string().length(6),
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = registerSchema.parse(req.body);
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
      userId: result.userId,
      requiresVerification: result.requiresVerification,
      emailDelivery: result.emailDelivery,
      emailSent: result.emailSent,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function verifyEmailLink(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, userId } = verifyEmailLinkSchema.parse(req.query);
    const result = await authService.verifyEmailLink(userId, token);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = verifyEmailSchema.parse(req.body);
    await authService.verifyEmail(data);
    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function verifyEmailFromQuery(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = verifyEmailTokenQuerySchema.parse(req.query);
    await authService.verifyEmail({ token });
    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function verifyPhone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = verifyPhoneSchema.parse(req.body);
    const result = await authService.verifyPhone(data.userId, data.otp);
    res.json(result);
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

export async function resendOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = resendOTPSchema.parse(req.body);
    const result = await authService.resendOTP(data);
    res.json({ success: true, message: 'Verification email sent.', userId: result.userId });
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

export async function sendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = sendVerificationSchema.parse(req.body);
    const result = await authService.sendVerification(email);
    res.json({ success: true, message: result.message + '.', userId: result.userId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function verifyCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, code } = verifyCodeSchema.parse(req.body);
    await authService.verifyCode(email, code);
    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function verifyEmailToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = verifyEmailTokenSchema.parse(req.body);
    const result = await authService.verifyEmailToken(token);
    res.json({ success: true, message: 'Email verified successfully.', userId: result.userId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = resendOTPSchema.parse(req.body);
    const result = await authService.resendVerification(data);
    res.json({ success: true, message: 'Verification email sent.', userId: result.userId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}
