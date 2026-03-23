import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

router.get('/users', async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        kycStatus: true,
        kycTier: true,
        createdAt: true,
      },
    }),
    prisma.user.count(),
  ]);

  res.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.get('/kyc/queue', async (_req, res: Response) => {
  const queue = await prisma.kycDocument.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ queue });
});

router.post('/kyc/:id/approve', async (req: AuthRequest, res: Response) => {
  const doc = await prisma.kycDocument.update({
    where: { id: req.params.id },
    data: {
      status: 'VERIFIED',
      reviewedBy: req.user!.userId,
      reviewedAt: new Date(),
    },
  });

  await prisma.user.update({
    where: { id: doc.userId },
    data: {
      kycStatus: 'APPROVED',
      kycTier: Math.max(doc.kycTier || 1, 2),
    },
  });

  res.json({ approved: true, document: doc });
});

router.post('/kyc/:id/reject', async (req: AuthRequest, res: Response) => {
  const parsed = z.object({ reason: z.string().min(3).default('Rejected by compliance') }).safeParse(req.body || {});
  const reason = parsed.success ? parsed.data.reason : 'Rejected by compliance';

  const doc = await prisma.kycDocument.update({
    where: { id: req.params.id },
    data: {
      status: 'REJECTED',
      rejectionReason: reason,
      reviewedBy: req.user!.userId,
      reviewedAt: new Date(),
    },
  });

  await prisma.user.update({
    where: { id: doc.userId },
    data: { kycStatus: 'REJECTED' },
  });

  res.json({ rejected: true, document: doc });
});

router.get('/transactions', async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.type) where.type = req.query.type;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export default router;
