import { Router } from 'express';
import kycRoutes from './kyc';
import webhooksRoutes from './webhooks';
import healthRoutes from './health';
import adminRoutes from './admin';

const router = Router();

router.use('/kyc', kycRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/health', healthRoutes);
router.use('/admin', adminRoutes);

export default router;
