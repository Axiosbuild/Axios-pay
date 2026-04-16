import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'RATE_LIMIT', message: 'Too many attempts. Try again in 15 minutes.' },
});

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user account
 *     parameters:
 *       - in: header
 *         name: X-Idempotency-Key
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional key to safely retry the same registration request.
 *     responses:
 *       201:
 *         description: Registration accepted
 *       400:
 *         description: Validation or duplicate registration error
 *         content:
 *           application/json:
 *             examples:
 *               duplicateEmail:
 *                 value:
 *                   error: EMAIL_EXISTS
 *                   message: Email already registered
 *               duplicatePhone:
 *                 value:
 *                   error: PHONE_EXISTS
 *                   message: Phone number already registered
 *       409:
 *         description: Legacy duplicate conflict response (backward compatibility)
 *       500:
 *         description: Internal server error
 */
router.post('/register', authLimiter, authController.register);
router.post('/verify-email', authLimiter, authController.verifyEmail);
router.get('/verify-email-link', authLimiter, authController.verifyEmailLink);
router.post('/verify-phone', authLimiter, authController.verifyPhone);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/resend-otp', authLimiter, authController.resendOTP);
router.post('/2fa/verify', authLimiter, authController.verify2FALogin);

export default router;
