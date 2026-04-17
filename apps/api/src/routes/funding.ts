import { Request, Response, Router } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/prisma';
import { getInterswitchToken } from '../services/interswitchAuth';
import { creditWallet, getAllBalances } from '../services/walletService';

const router = Router();

const PAYMENT_BASE =
  process.env.INTERSWITCH_ENV === 'live'
    ? 'https://api.interswitchng.com'
    : 'https://sandbox.interswitchng.com';

type FundingCurrency = 'NGN' | 'KES' | 'UGX' | 'GHS' | 'ZAR';

const CURRENCY_CODE_TO_NUMERIC: Record<FundingCurrency, string> = {
  NGN: '566',
  KES: '404',
  UGX: '800',
  GHS: '936',
  ZAR: '710',
};

const MIN_AMOUNTS: Record<FundingCurrency, number> = {
  NGN: 100,
  KES: 50,
  UGX: 500,
  GHS: 5,
  ZAR: 20,
};

function normalizeCurrency(currency?: string): FundingCurrency {
  const normalized = (currency || 'NGN').toUpperCase();
  if (!['NGN', 'KES', 'UGX', 'GHS', 'ZAR'].includes(normalized)) {
    throw new Error('UNSUPPORTED_CURRENCY');
  }
  return normalized as FundingCurrency;
}

router.post('/initiate', async (req: Request, res: Response): Promise<void> => {
  const { userId, amount } = req.body as { userId?: string; amount?: number };
  let currency: FundingCurrency;

  try {
    currency = normalizeCurrency((req.body as { currency?: string }).currency);
  } catch {
    res.status(400).json({ error: 'Unsupported currency.' });
    return;
  }

  if (!userId || !amount || amount <= 0) {
    res.status(400).json({ error: 'userId and a positive amount are required.' });
    return;
  }

  if (amount < MIN_AMOUNTS[currency]) {
    res.status(400).json({
      error: `Minimum funding amount for ${currency} is ${MIN_AMOUNTS[currency]}.`,
    });
    return;
  }

  try {
    const reference = `FUND-${uuidv4().slice(0, 8).toUpperCase()}-${Date.now()}`;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    await prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        status: 'PENDING',
        fromCurrency: currency,
        toCurrency: currency,
        fromAmount: amount,
        toAmount: amount,
        exchangeRate: 1,
        fee: 0,
        reference,
        narration: `Wallet funding - ${currency}`,
        metadata: { initiatedAt: new Date().toISOString(), flow: 'funding' },
      },
    });

    const token = await getInterswitchToken();

    const { data } = await axios.post(
      `${PAYMENT_BASE}/api/v2/quickteller/payments/initiate`,
      {
        amount: amount * 100,
        currencyCode: CURRENCY_CODE_TO_NUMERIC[currency],
        merchantCode: process.env.INTERSWITCH_MERCHANT_CODE,
        payableCode: process.env.INTERSWITCH_PAYABLE_CODE,
        customerId: user.email,
        transactionReference: reference,
        redirectUrl: `${process.env.FRONTEND_URL}/wallet/fund/callback?ref=${reference}`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({
      reference,
      redirectUrl: data.redirectUrl,
      transactionReference: reference,
    });
  } catch (error) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error('[Funding Initiate]', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to initiate funding.' });
  }
});

router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const { reference } = req.body as { reference?: string };
  if (!reference) {
    res.status(400).json({ error: 'reference is required.' });
    return;
  }

  try {
    const token = await getInterswitchToken();
    const { data } = await axios.get(
      `${PAYMENT_BASE}/api/v2/quickteller/payments/requery?transactionReference=${reference}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const transaction = await prisma.transaction.findUnique({ where: { reference } });
    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    if (data.responseCode === '00' && transaction.status === 'PENDING') {
      await prisma.transaction.update({
        where: { reference },
        data: {
          status: 'COMPLETED',
          metadata: {
            ...(transaction.metadata && typeof transaction.metadata === 'object' && !Array.isArray(transaction.metadata)
              ? (transaction.metadata as Record<string, unknown>)
              : {}),
            confirmedAt: new Date().toISOString(),
          },
        },
      });

      await creditWallet(transaction.userId, transaction.toCurrency as FundingCurrency, Number(transaction.toAmount));
    } else if (data.responseCode !== '00' && transaction.status === 'PENDING') {
      await prisma.transaction.update({
        where: { reference },
        data: { status: 'FAILED' },
      });
    }

    res.status(200).json({
      status: data.responseCode === '00' ? 'SUCCESS' : 'FAILED',
      amount: Number(transaction.toAmount),
      currency: transaction.toCurrency,
      reference,
    });
  } catch (error) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error('[Funding Verify]', err.response?.data || err.message);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

router.get('/balance/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const balances = await getAllBalances(req.params.userId);
    res.status(200).json({ balances });
  } catch {
    res.status(500).json({ error: 'Could not fetch balance.' });
  }
});

export default router;
