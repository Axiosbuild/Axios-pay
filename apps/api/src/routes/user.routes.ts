import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.middleware';
import * as userController from '../controllers/user.controller';

const router = Router();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'RATE_LIMIT', message: 'Too many requests. Try again later.' },
});

router.use(apiLimiter);
router.use(requireAuth);
router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);

export default router;
