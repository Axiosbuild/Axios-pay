import { Router } from 'express';
import {
  fundWalletViaQuickteller,
  getFundingWalletBalance,
  interswitchFundingWebhook,
} from '../controllers/wallet-funding.controller';

const router = Router();

// Public endpoint used by the frontend to initialize funding transactions.
router.post('/fund-wallet', fundWalletViaQuickteller);

// Public endpoint called by Interswitch after payment completion.
router.post('/webhook/interswitch', interswitchFundingWebhook);

// Public endpoint used by success page to fetch latest wallet balance.
router.get('/wallet-balance', getFundingWalletBalance);

export default router;
