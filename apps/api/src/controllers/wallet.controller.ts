import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as walletService from '../services/wallet.service';
import { prisma } from '../config/prisma';
import { deleteOtpSession, getOtpSession } from '../services/otpStore';

const fundSchema = z.object({
  amount: z.number().positive().min(100),
  transferToken: z.string().min(1).optional(),
  transactionReference: z.string().min(1).optional(),
});

const swapSchema = z.object({
  fromCurrency: z.enum(['NGN', 'UGX', 'KES', 'GHS', 'ZAR']),
  toCurrency: z.enum(['NGN', 'UGX', 'KES', 'GHS', 'ZAR']),
  fromAmount: z.number().positive(),
});

const recurringSchema = z.object({
  amount: z.number().positive().min(100),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
});

const refundSchema = z.object({
  transactionId: z.string().min(1),
  reason: z.string().min(3).max(200),
});

const paymentLinkSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1).max(200),
  expiresAt: z.string().datetime(),
});

const resolveAccountSchema = z.object({
  bankCode: z.string().min(1),
  accountNumber: z.string().regex(/^\d{6,18}$/),
  countryCode: z.string().trim().toUpperCase().length(2).optional(),
  currency: z.enum(['NGN', 'UGX', 'KES', 'GHS', 'ZAR']).optional(),
});

const sendMoneySchema = z.object({
  bankCode: z.string().min(1),
  accountNumber: z.string().regex(/^\d{6,18}$/),
  accountName: z.string().min(1),
  amount: z.number().positive().min(1000),
  narration: z.string().max(200).optional(),
  countryCode: z.string().trim().toUpperCase().length(2).optional(),
  currency: z.enum(['NGN', 'UGX', 'KES', 'GHS', 'ZAR']).optional(),
});

const transferToAxiosUserSchema = z.object({
  recipientEmail: z.string().email(),
  amount: z.number().positive().min(100),
  narration: z.string().max(200).optional(),
  senderCurrency: z.enum(['NGN', 'UGX', 'KES', 'GHS', 'ZAR']).optional(),
});

const paycodeSchema = z.object({
  amount: z.number().positive(),
});

export async function getWallets(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const wallets = await walletService.getWallets(req.userId!);
    res.json(wallets);
  } catch (err) {
    next(err);
  }
}

export async function fundWallet(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = fundSchema.parse(req.body);
    if (!data.transferToken || !data.transactionReference) {
      res.status(403).json({ error: 'OTP verification required before payment initiation.' });
      return;
    }

    const otpSession = getOtpSession(data.transferToken);

    if (!otpSession || !otpSession.verified) {
      res.status(403).json({ error: 'Invalid or unverified transfer token.' });
      return;
    }

    if (otpSession.transactionReference !== data.transactionReference) {
      res.status(403).json({ error: 'Transfer token does not match transaction reference.' });
      return;
    }

    deleteOtpSession(data.transferToken);

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true },
    });

    if (!user) {
      res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found' });
      return;
    }

    const result = await walletService.fundWallet(
      req.userId!,
      data.amount,
      user.email,
      data.transactionReference
    );

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function verifyDeposit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await walletService.verifyDeposit(req.userId!, req.params.reference);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function swapCurrency(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = swapSchema.parse(req.body);
    const result = await walletService.swapCurrency(
      req.userId!,
      data.fromCurrency,
      data.toCurrency,
      data.fromAmount,
      req.header('X-Pin-Token') || undefined
    );
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function getTransactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string | undefined;

    const result = await walletService.getTransactions(req.userId!, page, limit, type);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const transaction = await walletService.getTransaction(req.userId!, req.params.id);
    res.json(transaction);
  } catch (err) {
    next(err);
  }
}

export async function createRecurring(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = recurringSchema.parse(req.body);
    const result = await walletService.createRecurringDeposit(req.userId!, data.amount, data.frequency);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function listRecurring(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await walletService.listRecurringDeposits(req.userId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function cancelRecurring(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await walletService.cancelRecurringDeposit(req.userId!, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function requestRefund(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = refundSchema.parse(req.body);
    const result = await walletService.requestRefund(req.userId!, data.transactionId, data.reason);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function createPaymentLink(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = paymentLinkSchema.parse(req.body);
    const result = await walletService.createPaymentLink(
      req.userId!,
      data.amount,
      data.description,
      new Date(data.expiresAt)
    );
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function listPaymentLinks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await walletService.listPaymentLinks(req.userId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deactivatePaymentLink(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await walletService.deactivatePaymentLink(req.userId!, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listBanks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const countryCode = typeof req.query.countryCode === 'string' ? req.query.countryCode : undefined;
    const currency = typeof req.query.currency === 'string' ? req.query.currency : undefined;
    const result = await walletService.listBanksCached({ countryCode, currency });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function resolveBankAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = resolveAccountSchema.parse(req.body);
    const result = await walletService.resolveBankAccount(data.bankCode, data.accountNumber, {
      countryCode: data.countryCode,
      currency: data.currency,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function sendTransfer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = sendMoneySchema.parse(req.body);
    const result = await walletService.withdrawToBank(req.userId!, {
      bankCode: data.bankCode,
      accountNumber: data.accountNumber,
      accountName: data.accountName,
      amount: data.amount,
      narration: data.narration,
      pinToken: req.header('X-Pin-Token') || undefined,
      countryCode: data.countryCode,
      currency: data.currency,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function transferToAxiosUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = transferToAxiosUserSchema.parse(req.body);
    const result = await walletService.transferToAxiosUser(
      req.userId!,
      data.recipientEmail,
      data.amount,
      data.narration,
      req.header('X-Pin-Token') || undefined,
      data.senderCurrency
    );
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function generatePaycode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = paycodeSchema.parse(req.body);
    const result = await walletService.generatePaycode(req.userId!, data.amount);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
      return;
    }
    next(err);
  }
}

export async function listPaycodes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await walletService.listPaycodes(req.userId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
