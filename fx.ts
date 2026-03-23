import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { fxService, CURRENCY_INFO, SUPPORTED_CURRENCIES } from '../services/fx.service';

const router = Router();

// GET /fx/rates - public
router.get('/rates', async (_req: Request, res: Response) => {
  const rates = await fxService.getAllRates();
  res.json({ rates, updatedAt: new Date() });
});

// GET /fx/currencies - public
router.get('/currencies', (_req: Request, res: Response) => {
  const currencies = SUPPORTED_CURRENCIES.map((code) => ({
    code,
    ...CURRENCY_INFO[code],
  }));
  res.json({ currencies });
});

// GET /fx/rate?from=NGN&to=UGX - public
router.get('/rate', async (req: Request, res: Response) => {
  const { from, to } = z.object({
    from: z.string().length(3).toUpperCase(),
    to: z.string().length(3).toUpperCase(),
  }).parse(req.query);

  const rate = await fxService.getRate(from, to);
  if (!rate) {
    res.status(404).json({ error: `No rate available for ${from}/${to}` });
    return;
  }
  res.json({ rate });
});

// GET /fx/quote - authenticated
router.get('/quote', authenticate, async (req: Request, res: Response) => {
  const { from, to, amount, direction } = z.object({
    from: z.string().length(3).toUpperCase(),
    to: z.string().length(3).toUpperCase(),
    amount: z.string().transform(Number),
    direction: z.enum(['send', 'receive']).default('send'),
  }).parse(req.query);

  if (from === to) {
    res.status(400).json({ error: 'Source and destination currencies must differ' });
    return;
  }

  if (amount <= 0) {
    res.status(400).json({ error: 'Amount must be positive' });
    return;
  }

  const quote = await fxService.generateQuote(from, to, amount, direction);
  res.json({ quote });
});

// POST /fx/refresh - internal
router.post('/refresh', async (_req: Request, res: Response) => {
  await fxService.refreshRates();
  res.json({ message: 'Rates refreshed' });
});

export default router;
