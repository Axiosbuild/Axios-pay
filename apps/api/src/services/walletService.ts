import Decimal from 'decimal.js';
import { prisma } from '../config/prisma';

type CurrencyCode = 'NGN' | 'KES' | 'UGX' | 'GHS' | 'ZAR';

const SUPPORTED_CURRENCIES: CurrencyCode[] = ['NGN', 'KES', 'UGX', 'GHS', 'ZAR'];

function assertCurrency(currency: string): CurrencyCode {
  const upper = currency.toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(upper as CurrencyCode)) {
    throw new Error('UNSUPPORTED_CURRENCY');
  }
  return upper as CurrencyCode;
}

export async function getOrCreateWallet(userId: string, currency: CurrencyCode = 'NGN') {
  const normalized = assertCurrency(currency);

  return prisma.wallet.upsert({
    where: {
      userId_currency: {
        userId,
        currency: normalized,
      },
    },
    update: {},
    create: {
      userId,
      currency: normalized,
      balance: 0,
    },
  });
}

export async function creditWallet(userId: string, currency: CurrencyCode, amount: number): Promise<void> {
  const normalized = assertCurrency(currency);
  const decimalAmount = new Decimal(amount);

  if (decimalAmount.lte(0)) {
    throw new Error('INVALID_AMOUNT');
  }

  await getOrCreateWallet(userId, normalized);
  await prisma.wallet.update({
    where: {
      userId_currency: {
        userId,
        currency: normalized,
      },
    },
    data: {
      balance: {
        increment: decimalAmount.toNumber(),
      },
    },
  });
}

export async function debitWallet(userId: string, currency: CurrencyCode, amount: number): Promise<void> {
  const normalized = assertCurrency(currency);
  const decimalAmount = new Decimal(amount);

  if (decimalAmount.lte(0)) {
    throw new Error('INVALID_AMOUNT');
  }

  const wallet = await getOrCreateWallet(userId, normalized);
  const current = new Decimal(wallet.balance.toString());

  if (current.lt(decimalAmount)) {
    throw new Error(`Insufficient ${normalized} balance.`);
  }

  await prisma.wallet.update({
    where: {
      userId_currency: {
        userId,
        currency: normalized,
      },
    },
    data: {
      balance: {
        decrement: decimalAmount.toNumber(),
      },
    },
  });
}

export async function getBalance(userId: string, currency: CurrencyCode): Promise<number> {
  const normalized = assertCurrency(currency);
  const wallet = await getOrCreateWallet(userId, normalized);
  return Number(wallet.balance);
}

export async function getAllBalances(userId: string): Promise<Record<CurrencyCode, number>> {
  const wallets = await prisma.wallet.findMany({ where: { userId } });
  const result: Record<CurrencyCode, number> = {
    NGN: 0,
    KES: 0,
    UGX: 0,
    GHS: 0,
    ZAR: 0,
  };

  for (const wallet of wallets) {
    if (SUPPORTED_CURRENCIES.includes(wallet.currency as CurrencyCode)) {
      result[wallet.currency as CurrencyCode] = Number(wallet.balance);
    }
  }

  return result;
}
