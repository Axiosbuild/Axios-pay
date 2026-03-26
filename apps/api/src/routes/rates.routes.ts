import { Router } from 'express';
import * as ratesController from '../controllers/rates.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/health', ratesController.getHealth);
router.post('/refresh', requireAuth, ratesController.refreshRates);
router.get('/', ratesController.getAllRates);
router.get('/:from/:to', ratesController.getRate);

export default router;
