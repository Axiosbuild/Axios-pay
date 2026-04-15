import crypto from 'crypto';
import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createPendingFundingTransaction,
  creditWalletBalance,
  getOrCreateWallet,
  markFundingTransactionFailed,
  markFundingTransactionSuccessful,
  resolveUserIdFromEmail,
} from '../models/mock-wallet-funding.model';
import { initializeInterswitchPayment } from '../services/wallet-funding.service';
import { env } from '../config/env';

const fundWalletSchema = z.object({
  amount: z.number().positive().min(100),
  email: z.string().email(),
});

const walletBalanceQuerySchema = z.object({
  email: z.string().email(),
});

const webhookSchema = z.object({
  transactionReference: z.string().uuid(),
  status: z.string(),
  amount: z.number().optional(),
});

export async function fundWalletViaQuickteller(req: Request, res: Response): Promise<void> {
  try {
    const parsed = fundWalletSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid amount or email',
        details: parsed.error.flatten(),
      });
      return;
    }

    const { amount, email } = parsed.data;
    const userId = resolveUserIdFromEmail(email);
    const transactionReference = crypto.randomUUID();
    const redirectUrl = `${env.FRONTEND_URL}/payment-success?email=${encodeURIComponent(email)}`;

    const initResult = await initializeInterswitchPayment({
      amount,
      email,
      transactionReference,
      redirectUrl,
    });

    createPendingFundingTransaction({
      reference: transactionReference,
      amount,
      userId,
      email,
      paymentUrl: initResult.paymentUrl,
      providerResponse: initResult.rawResponse,
    });
    getOrCreateWallet(userId);

    res.status(200).json({
      transactionReference,
      paymentUrl: initResult.paymentUrl,
    });
  } catch (error) {
    console.error('[WalletFunding][FundWallet] failed', error);
    res.status(502).json({
      error: 'PAYMENT_INITIALIZATION_FAILED',
      message:
        'Unable to initialize payment with Interswitch at the moment. Please retry in a few minutes.',
    });
  }
}

export async function interswitchFundingWebhook(req: Request, res: Response): Promise<void> {
  try {
    const parsed = webhookSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid webhook payload',
        details: parsed.error.flatten(),
      });
      return;
    }

    const { transactionReference, status } = parsed.data;
    const normalizedStatus = status.trim().toUpperCase();

    if (normalizedStatus !== 'SUCCESSFUL') {
      markFundingTransactionFailed(transactionReference);
      res.status(200).json({ received: true, credited: false, reason: 'NON_SUCCESS_STATUS' });
      return;
    }

    const marked = markFundingTransactionSuccessful(transactionReference);
    if (!marked) {
      res.status(404).json({
        error: 'TRANSACTION_NOT_FOUND',
        message: 'No matching transaction for webhook reference',
      });
      return;
    }

    if (!marked.wasAlreadySuccessful) {
      creditWalletBalance(marked.transaction.userId, marked.transaction.amount);
    }

    res.status(200).json({ received: true, credited: !marked.wasAlreadySuccessful });
  } catch (error) {
    console.error('[WalletFunding][Webhook] failed', error);
    res.status(500).json({
      error: 'WEBHOOK_PROCESSING_FAILED',
      message: 'Could not process webhook payload.',
    });
  }
}

export async function getFundingWalletBalance(req: Request, res: Response): Promise<void> {
  try {
    const parsed = walletBalanceQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'A valid email query parameter is required',
      });
      return;
    }

    const userId = resolveUserIdFromEmail(parsed.data.email);
    const wallet = getOrCreateWallet(userId);
    res.status(200).json(wallet);
  } catch (error) {
    console.error('[WalletFunding][WalletBalance] failed', error);
    res.status(500).json({
      error: 'WALLET_BALANCE_FETCH_FAILED',
      message: 'Unable to fetch wallet balance right now.',
    });
  }
}
