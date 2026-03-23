// users.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { interswitchService } from '../services/interswitch.service';

const router = Router();
router.use(authenticate);

router.get('/me', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true, email: true, phone: true, firstName: true, lastName: true,
      dateOfBirth: true, nationality: true, residenceCountry: true,
      kycStatus: true, kycTier: true, twoFactorEnabled: true,
      emailVerified: true, createdAt: true,
      wallets: { where: { isActive: true } },
      kycDocuments: { orderBy: { createdAt: 'desc' } },
    },
  });
  res.json(user);
});

router.patch('/me', async (req: AuthRequest, res: Response) => {
  const data = z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    phone: z.string().min(10).optional(),
  }).parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data,
    select: { id: true, email: true, firstName: true, lastName: true, phone: true },
  });
  res.json(user);
});

// Name enquiry for bank account
router.get('/name-enquiry', async (req: AuthRequest, res: Response) => {
  const { accountNumber, bankCode } = z.object({
    accountNumber: z.string().length(10),
    bankCode: z.string(),
  }).parse(req.query);

  const result = await interswitchService.verifyBankAccount(accountNumber, bankCode);
  res.json(result);
});

router.get('/beneficiaries', async (req: AuthRequest, res: Response) => {
  const beneficiaries = await prisma.beneficiary.findMany({
    where: { userId: req.user!.userId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(beneficiaries);
});

router.post('/beneficiaries', async (req: AuthRequest, res: Response) => {
  const data = z.object({
    nickname: z.string().min(2),
    firstName: z.string(),
    lastName: z.string(),
    country: z.string().length(2),
    currency: z.string().length(3),
    accountNumber: z.string().min(8),
    bankCode: z.string(),
    bankName: z.string(),
  }).parse(req.body);

  const beneficiary = await prisma.beneficiary.create({
    data: { userId: req.user!.userId, ...data },
  });
  res.status(201).json(beneficiary);
});

router.delete('/beneficiaries/:id', async (req: AuthRequest, res: Response) => {
  await prisma.beneficiary.updateMany({
    where: { id: req.params.id, userId: req.user!.userId },
    data: { isActive: false },
  });
  res.json({ message: 'Beneficiary removed' });
});

export default router;
