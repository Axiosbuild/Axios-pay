import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as webhookController from '../controllers/webhook.controller';

const router = Router();

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'RATE_LIMIT', message: 'Too many requests.' },
});

router.post('/interswitch', webhookLimiter, webhookController.interswitchWebhook);

export default router;
