import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.middleware';
import { requestInterswitchOtp, validateInterswitchOtp } from '../services/interswitchOtp';
import {
  saveOtpSession,
  getOtpSession,
  markOtpVerified,
  incrementAttempts,
  deleteOtpSession,
  isExpired,
  MAX_ATTEMPTS,
  OTP_TTL_MS,
  saveVerifiedTransferSession,
} from '../services/otpStore';

const router = Router();

const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: { error: 'Too many OTP requests. Please wait 10 minutes.' },
  keyGenerator: (req) => req.body?.customerPhone ?? req.ip ?? 'unknown',
});

const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Too many verification attempts. Please wait 10 minutes.' },
});

router.use(requireAuth);

router.post('/request', otpRequestLimiter, async (req: Request, res: Response): Promise<void> => {
  const { customerPhone, transactionReference, amount } = req.body;

  if (!customerPhone || !transactionReference || !amount) {
    res.status(400).json({
      error: 'customerPhone, transactionReference, and amount are required.',
    });
    return;
  }

  try {
    const { sessionToken, message } = await requestInterswitchOtp({
      customerPhone,
      transactionReference,
      amount: Number(amount),
    });

    saveOtpSession(sessionToken, {
      otp: '',
      expiresAt: Date.now() + OTP_TTL_MS,
      customerPhone,
      transactionReference,
    });

    res.status(200).json({
      sessionToken,
      message,
      expiresInSeconds: OTP_TTL_MS / 1000,
    });
  } catch (err: any) {
    console.error('[OTP Request Error]', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to dispatch OTP.' });
  }
});

router.post('/verify', otpVerifyLimiter, async (req: Request, res: Response): Promise<void> => {
  const { sessionToken, otp, transactionReference } = req.body;

  if (!sessionToken || !otp || !transactionReference) {
    res.status(400).json({
      error: 'sessionToken, otp, and transactionReference are required.',
    });
    return;
  }

  const session = getOtpSession(sessionToken);

  if (!session) {
    res.status(404).json({ error: 'OTP session not found. Please request a new OTP.' });
    return;
  }

  if (isExpired(session)) {
    deleteOtpSession(sessionToken);
    res.status(410).json({ error: 'OTP has expired. Please request a new one.' });
    return;
  }

  if (session.verified) {
    res.status(409).json({ error: 'This OTP session has already been used.' });
    return;
  }

  if (session.transactionReference !== transactionReference) {
    res.status(400).json({ error: 'Transaction reference mismatch.' });
    return;
  }

  const attempts = incrementAttempts(sessionToken);
  if (attempts > MAX_ATTEMPTS) {
    deleteOtpSession(sessionToken);
    res.status(429).json({
      error: 'Maximum OTP attempts exceeded. Please request a new OTP.',
    });
    return;
  }

  try {
    const isValid = await validateInterswitchOtp({
      sessionToken,
      otp,
      transactionReference,
    });

    if (!isValid) {
      const remaining = MAX_ATTEMPTS - attempts;
      res.status(401).json({
        error: 'Invalid OTP.',
        remaining: remaining > 0 ? remaining : 0,
      });
      return;
    }

    markOtpVerified(sessionToken);

    const transferToken = uuidv4();
    saveVerifiedTransferSession(transferToken, {
      otp: transferToken,
      expiresAt: Date.now() + OTP_TTL_MS,
      customerPhone: session.customerPhone,
      transactionReference: session.transactionReference,
    });

    deleteOtpSession(sessionToken);

    res.status(200).json({
      verified: true,
      transferToken,
      message: 'OTP verified successfully. Proceed with transfer.',
    });
  } catch (err: any) {
    console.error('[OTP Verify Error]', err.response?.data || err.message);
    res.status(500).json({ error: 'OTP verification failed.' });
  }
});

router.post('/resend', otpRequestLimiter, async (req: Request, res: Response): Promise<void> => {
  const { sessionToken, customerPhone, transactionReference, amount } = req.body;

  if (!customerPhone || !transactionReference || !amount) {
    res.status(400).json({
      error: 'customerPhone, transactionReference, and amount are required.',
    });
    return;
  }

  if (sessionToken) {
    deleteOtpSession(sessionToken);
  }

  try {
    const { sessionToken: newToken, message } = await requestInterswitchOtp({
      customerPhone,
      transactionReference,
      amount: Number(amount),
    });

    saveOtpSession(newToken, {
      otp: '',
      expiresAt: Date.now() + OTP_TTL_MS,
      customerPhone,
      transactionReference,
    });

    res.status(200).json({
      sessionToken: newToken,
      message,
      expiresInSeconds: OTP_TTL_MS / 1000,
    });
  } catch (err: any) {
    console.error('[OTP Resend Error]', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to resend OTP.' });
  }
});

export default router;
