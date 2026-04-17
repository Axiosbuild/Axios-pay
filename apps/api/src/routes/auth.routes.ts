import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller';

const router = Router();
const AUTH_ROUTE_TIMEOUT_MS = 15_000;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'RATE_LIMIT', message: 'Too many attempts. Try again in 15 minutes.' },
});

router.use((req, res, next) => {
  req.setTimeout(AUTH_ROUTE_TIMEOUT_MS);
  res.setTimeout(AUTH_ROUTE_TIMEOUT_MS);
  next();
});

router.post('/register', authLimiter, authController.register);
router.post('/accept-terms', authLimiter, authController.acceptTerms);
router.post('/submit-kyc', authLimiter, authController.submitKYCOnboarding);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/2fa/verify', authLimiter, authController.verify2FALogin);

export default router;
