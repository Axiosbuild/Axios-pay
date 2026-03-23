import { Router, Response } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { authenticate, requireKYC, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { getQuote } from '../lib/redis';
import { fxService, FXQuote } from '../services/fx.service';
import { interswitchService } from '../services/interswitch.service';
import { io } from '../server';
import { logger } from '../lib/logger';

const router = Router();
router.use(authenticate);

// Tier limits in USD equivalent
const TIER_LIMITS = {
  0: { daily: 0, monthly: 0 },
  1: { daily: 200, monthly: 1000 },
  2: { daily: 2000, monthly: 10000 },
  3: { daily: 10000, monthly: 50000 },
};

async function checkTransactionLimits(
  userId: string,
  kycTier: number,
  amountUSD: number
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = TIER_LIMITS[kycTier as keyof typeof TIER_LIMITS] || TIER_LIMITS[0];

  if (limits.daily === 0) {
    return { allowed: false, reason: 'KYC verification required to transact' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dailySum, monthlySum] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        status: 'COMPLETED',
        createdAt: { gte: today },
        type: { in: ['SWAP', 'WITHDRAWAL', 'TRANSFER'] },
      },
      _sum: { fromAmount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        status: 'COMPLETED',
        createdAt: { gte: monthStart },
        type: { in: ['SWAP', 'WITHDRAWAL', 'TRANSFER'] },
      },
      _sum: { fromAmount: true },
    }),
  ]);

  const dailyUsed = parseFloat((dailySum._sum.fromAmount || new Decimal(0)).toString());
  const monthlyUsed = parseFloat((monthlySum._sum.fromAmount || new Decimal(0)).toString());

  if (dailyUsed + amountUSD > limits.daily) {
    return { allowed: false, reason: `Daily limit of $${limits.daily} exceeded` };
  }
  if (monthlyUsed + amountUSD > limits.monthly) {
    return { allowed: false, reason: `Monthly limit of $${limits.monthly} exceeded` };
  }

  return { allowed: true };
}

// GET /transactions
router.get('/', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', type, status, currency } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: Record<string, unknown> = { userId: req.user!.userId };
  if (type) where.type = type;
  if (status) where.status = status;
  if (currency) where.OR = [{ fromCurrency: currency }, { toCurrency: currency }];

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({
    transactions,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
});

// GET /transactions/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const txn = await prisma.transaction.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!txn) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  res.json(txn);
});

// POST /transactions/swap
router.post('/swap', requireKYC(1), async (req: AuthRequest, res: Response) => {
  try {
    const { quoteId, fromCurrency, toCurrency, fromAmount } = z.object({
      quoteId: z.string().uuid(),
      fromCurrency: z.string().length(3),
      toCurrency: z.string().length(3),
      fromAmount: z.number().positive(),
    }).parse(req.body);

    // Validate quote
    const quote = await getQuote<FXQuote>(quoteId);
    if (!quote) {
      res.status(400).json({ error: 'Quote expired. Please get a new quote.' });
      return;
    }

    if (quote.fromCurrency !== fromCurrency || quote.toCurrency !== toCurrency) {
      res.status(400).json({ error: 'Quote currency mismatch' });
      return;
    }

    // Check KYC limits
    const usdRate = await fxService.getRate(fromCurrency, 'USD');
    const amountUSD = fromAmount * (usdRate?.mid || 1);
    const limitCheck = await checkTransactionLimits(req.user!.userId, req.user!.kycTier, amountUSD);

    if (!limitCheck.allowed) {
      res.status(403).json({ error: limitCheck.reason });
      return;
    }

    // Execute swap atomically
    const txn = await prisma.$transaction(async (tx) => {
      const fromWallet = await tx.wallet.findFirst({
        where: { userId: req.user!.userId, currency: fromCurrency, isActive: true },
      });

      if (!fromWallet) {
        throw new Error(`No ${fromCurrency} wallet found`);
      }

      const walletBalance = parseFloat(fromWallet.balance.toString());
      if (walletBalance < fromAmount + quote.fee) {
        throw new Error('Insufficient balance');
      }

      // Find or create destination wallet
      let toWallet = await tx.wallet.findFirst({
        where: { userId: req.user!.userId, currency: toCurrency, isActive: true },
      });

      if (!toWallet) {
        toWallet = await tx.wallet.create({
          data: { userId: req.user!.userId, currency: toCurrency },
        });
      }

      // Debit source wallet
      await tx.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: { decrement: fromAmount } },
      });

      // Credit destination wallet
      await tx.wallet.update({
        where: { id: toWallet.id },
        data: { balance: { increment: quote.toAmount } },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: req.user!.userId,
          type: 'SWAP',
          status: 'COMPLETED',
          fromCurrency,
          toCurrency,
          fromAmount,
          toAmount: quote.toAmount,
          exchangeRate: quote.rate,
          fee: quote.fee,
          debitWalletId: fromWallet.id,
          creditWalletId: toWallet.id,
          description: `Swap ${fromCurrency} to ${toCurrency}`,
          processedAt: new Date(),
          metadata: { quoteId, feePercent: quote.feePercent },
        },
      });

      // Record fee transaction
      await tx.transaction.create({
        data: {
          userId: req.user!.userId,
          type: 'FEE',
          status: 'COMPLETED',
          fromCurrency,
          toCurrency: fromCurrency,
          fromAmount: quote.fee,
          toAmount: quote.fee,
          exchangeRate: 1,
          fee: 0,
          debitWalletId: fromWallet.id,
          description: `Swap fee - ${transaction.id}`,
          processedAt: new Date(),
        },
      });

      return transaction;
    });

    // Emit WebSocket event
    io.to(`user:${req.user!.userId}`).emit('transaction:updated', { transaction: txn });

    logger.info('Swap completed', { txnId: txn.id, userId: req.user!.userId });
    res.status(201).json({ transaction: txn });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    const message = err instanceof Error ? err.message : 'Swap failed';
    res.status(400).json({ error: message });
  }
});

// POST /transactions/withdraw
router.post('/withdraw', requireKYC(1), async (req: AuthRequest, res: Response) => {
  try {
    const { currency, amount, bankCode, accountNumber, narration } = z.object({
      currency: z.string().length(3),
      amount: z.number().positive().min(100),
      bankCode: z.string(),
      accountNumber: z.string().min(10).max(10),
      narration: z.string().optional(),
    }).parse(req.body);

    // Verify bank account first
    const accountVerification = await interswitchService.verifyBankAccount(accountNumber, bankCode);

    const wallet = await prisma.wallet.findFirst({
      where: { userId: req.user!.userId, currency, isActive: true },
    });

    if (!wallet) {
      res.status(404).json({ error: `No ${currency} wallet found` });
      return;
    }

    const balance = parseFloat(wallet.balance.toString());
    if (balance < amount) {
      res.status(400).json({ error: 'Insufficient balance' });
      return;
    }

    // Create pending transaction
    const txn = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          lockedBalance: { increment: amount },
        },
      });

      return tx.transaction.create({
        data: {
          userId: req.user!.userId,
          type: 'WITHDRAWAL',
          status: 'PROCESSING',
          fromCurrency: currency,
          toCurrency: currency,
          fromAmount: amount,
          toAmount: amount,
          exchangeRate: 1,
          debitWalletId: wallet.id,
          description: narration || `Withdrawal to ${accountVerification.accountName}`,
          metadata: { bankCode, accountNumber, accountName: accountVerification.accountName },
        },
      });
    });

    // Initiate transfer via Interswitch
    try {
      const transfer = await interswitchService.doTransfer({
        amount,
        destinationAccountNumber: accountNumber,
        destinationBankCode: bankCode,
        narration: narration || `Axios Pay withdrawal - ${txn.id}`,
        reference: txn.reference,
      });

      await prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: txn.id },
          data: {
            status: transfer.responseCode === '00' ? 'COMPLETED' : 'FAILED',
            externalReference: transfer.transactionReference,
            processedAt: new Date(),
            failureReason: transfer.responseCode !== '00' ? transfer.responseDescription : null,
          },
        });

        // Release locked balance
        const newStatus: 'COMPLETED' | 'FAILED' = transfer.responseCode === '00' ? 'COMPLETED' : 'FAILED';
        if (newStatus === 'FAILED') {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: { increment: amount },
              lockedBalance: { decrement: amount },
            },
          });
        } else {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { lockedBalance: { decrement: amount } },
          });
        }
      });

      io.to(`user:${req.user!.userId}`).emit('transaction:updated', { transactionId: txn.id });
    } catch (transferErr) {
      logger.error('Transfer failed', { txnId: txn.id, error: transferErr });
      await prisma.transaction.update({
        where: { id: txn.id },
        data: { status: 'FAILED', failureReason: 'Transfer processing error' },
      });
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount }, lockedBalance: { decrement: amount } },
      });
    }

    const finalTxn = await prisma.transaction.findUnique({ where: { id: txn.id } });
    res.status(201).json({ transaction: finalTxn });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Withdrawal failed' });
  }
});

export default router;
