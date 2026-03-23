import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { SUPPORTED_CURRENCIES } from '../services/fx.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const wallets = await prisma.wallet.findMany({
    where: { userId: req.user!.userId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(wallets);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { currency } = z.object({
    currency: z.string().length(3).toUpperCase().refine((c) => SUPPORTED_CURRENCIES.includes(c), 'Unsupported currency'),
  }).parse(req.body);

  const existing = await prisma.wallet.findFirst({
    where: { userId: req.user!.userId, currency },
  });

  if (existing) {
    res.status(409).json({ error: `${currency} wallet already exists` });
    return;
  }

  const wallet = await prisma.wallet.create({
    data: { userId: req.user!.userId, currency },
  });
  res.status(201).json(wallet);
});

export default router;
