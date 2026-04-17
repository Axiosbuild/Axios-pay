import crypto from 'crypto';
import Decimal from 'decimal.js';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { getRate } from './rates.service';
import {
  initiatePayment,
  queryTransaction,
  initiateRefund,
  createPaymentLink as createPaymentLinkProvider,
  getBankList,
  resolveAccount,
  sendMoney,
} from './interswitch.service';
import { verifyPinToken } from './pin.service';
import { sendDepositConfirmationEmail } from './email.service';

const FEE_RATE = new Decimal('0.015'); // 1.5%
const SUPPORTED_TRANSFER_CURRENCIES = ['NGN', 'UGX', 'KES', 'GHS', 'ZAR'] as const;
const SUPPORTED_TRANSFER_COUNTRIES = ['NG', 'UG', 'KE', 'GH', 'SA'] as const;
const COUNTRY_ALIASES: Record<string, (typeof SUPPORTED_TRANSFER_COUNTRIES)[number]> = {
  ZA: 'SA',
};

const COUNTRY_TO_CURRENCY: Record<(typeof SUPPORTED_TRANSFER_COUNTRIES)[number], (typeof SUPPORTED_TRANSFER_CURRENCIES)[number]> = {
  NG: 'NGN',
  UG: 'UGX',
  KE: 'KES',
  GH: 'GHS',
  SA: 'ZAR',
};

const CURRENCY_TO_COUNTRY: Record<(typeof SUPPORTED_TRANSFER_CURRENCIES)[number], (typeof SUPPORTED_TRANSFER_COUNTRIES)[number]> = {
  NGN: 'NG',
  UGX: 'UG',
  KES: 'KE',
  GHS: 'GH',
  ZAR: 'SA',
};

const CURRENCY_DECIMAL_PLACES: Record<(typeof SUPPORTED_TRANSFER_CURRENCIES)[number], number> = {
  NGN: 2,
  UGX: 0,
  KES: 2,
  GHS: 2,
  ZAR: 2,
};

function normalizeCountryCode(countryCode?: string): (typeof SUPPORTED_TRANSFER_COUNTRIES)[number] {
  const normalizedRaw = (countryCode || '').trim().toUpperCase();
  const normalized = COUNTRY_ALIASES[normalizedRaw] ?? normalizedRaw;
  if (!SUPPORTED_TRANSFER_COUNTRIES.includes(normalized as (typeof SUPPORTED_TRANSFER_COUNTRIES)[number])) {
    throw new Error('UNSUPPORTED_COUNTRY');
  }
  return normalized as (typeof SUPPORTED_TRANSFER_COUNTRIES)[number];
}

function normalizeTransferCurrency(currency?: string): (typeof SUPPORTED_TRANSFER_CURRENCIES)[number] {
  const normalized = (currency || '').trim().toUpperCase();
  if (!SUPPORTED_TRANSFER_CURRENCIES.includes(normalized as (typeof SUPPORTED_TRANSFER_CURRENCIES)[number])) {
    throw new Error('UNSUPPORTED_CURRENCY');
  }
  return normalized as (typeof SUPPORTED_TRANSFER_CURRENCIES)[number];
}

function normalizeAccountNumber(accountNumber: string): string {
  const normalized = accountNumber.replace(/\D/g, '');
  if (normalized.length < 6 || normalized.length > 18) {
    throw new Error('INVALID_ACCOUNT_NUMBER');
  }
  return normalized;
}

function resolveCountryAndCurrency(params: {
  countryCode?: string;
  currency?: string;
  fallbackCountry?: string | null;
  fallbackCurrency?: string | null;
}): { countryCode: (typeof SUPPORTED_TRANSFER_COUNTRIES)[number]; currency: (typeof SUPPORTED_TRANSFER_CURRENCIES)[number] } {
  const hasCountry = Boolean(params.countryCode?.trim());
  const hasCurrency = Boolean(params.currency?.trim());

  if (hasCountry && hasCurrency) {
    const countryCode = normalizeCountryCode(params.countryCode);
    const currency = normalizeTransferCurrency(params.currency);
    if (COUNTRY_TO_CURRENCY[countryCode] !== currency) {
      throw new Error('COUNTRY_CURRENCY_MISMATCH');
    }
    return { countryCode, currency };
  }

  if (hasCountry) {
    const countryCode = normalizeCountryCode(params.countryCode);
    return { countryCode, currency: COUNTRY_TO_CURRENCY[countryCode] };
  }

  if (hasCurrency) {
    const currency = normalizeTransferCurrency(params.currency);
    return { countryCode: CURRENCY_TO_COUNTRY[currency], currency };
  }

  if (params.fallbackCurrency?.trim()) {
    const currency = normalizeTransferCurrency(params.fallbackCurrency);
    return { countryCode: CURRENCY_TO_COUNTRY[currency], currency };
  }

  if (params.fallbackCountry?.trim()) {
    const countryCode = normalizeCountryCode(params.fallbackCountry);
    return { countryCode, currency: COUNTRY_TO_CURRENCY[countryCode] };
  }

  return { countryCode: 'NG', currency: 'NGN' };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  if (local.length <= 2) return `***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

async function assertTransferCompliance(userId: string): Promise<{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  currency: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      country: true,
      currency: true,
      termsAccepted: true,
      kycStatus: true,
      isFrozen: true,
    },
  });

  if (!user) throw new Error('USER_NOT_FOUND');
  if (user.isFrozen) throw new Error('ACCOUNT_FROZEN');
  if (!user.termsAccepted) throw new Error('TERMS_NOT_ACCEPTED');
  if (!['SUBMITTED', 'APPROVED'].includes(user.kycStatus)) {
    throw new Error('KYC_REQUIRED');
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    country: user.country,
    currency: user.currency,
  };
}

export async function getWallets(userId: string) {
  return prisma.wallet.findMany({
    where: { userId },
    orderBy: { currency: 'asc' },
  });
}

export async function getWalletByCurrency(userId: string, currency: string) {
  return prisma.wallet.findUnique({
    where: { userId_currency: { userId, currency } },
  });
}

export async function fundWallet(
  userId: string,
  amount: number,
  userEmail: string,
  transactionReference?: string
): Promise<{ paymentUrl: string; reference: string }> {
  const decimalAmount = new Decimal(amount);
  if (decimalAmount.lt(100)) throw new Error('INVALID_AMOUNT');

  const { paymentUrl, reference } = await initiatePayment({
    amount,
    userId,
    userEmail,
    transactionReference,
  });

  await prisma.transaction.create({
    data: {
      userId,
      type: 'DEPOSIT',
      status: 'PENDING',
      fromCurrency: 'NGN',
      toCurrency: 'NGN',
      fromAmount: decimalAmount,
      toAmount: decimalAmount,
      exchangeRate: new Decimal(1),
      fee: new Decimal(0),
      reference,
      narration: 'Wallet funding — NGN',
      metadata: { provider: 'interswitch' },
    },
  });

  return { paymentUrl, reference };
}

export async function swapCurrency(
  userId: string,
  fromCurrency: string,
  toCurrency: string,
  fromAmount: number,
  pinToken?: string
): Promise<{
  transaction: object;
  fromAmount: string;
  toAmount: string;
  fee: string;
  rate: string;
}> {
  if (fromCurrency === toCurrency) throw new Error('SAME_CURRENCY');

  const decimalAmount = new Decimal(fromAmount);
  if (decimalAmount.lte(0)) throw new Error('INVALID_AMOUNT');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      dailySwapLimit: true,
      dailySwapUsed: true,
      dailyLimitResetAt: true,
    },
  });
  if (!user) throw new Error('USER_NOT_FOUND');

  await verifyPinToken(userId, pinToken);

  let dailySwapUsed = new Decimal(user.dailySwapUsed.toString());
  const now = new Date();
  if (user.dailyLimitResetAt <= now) {
    dailySwapUsed = new Decimal(0);
    await prisma.user.update({
      where: { id: userId },
      data: {
        dailySwapUsed: 0,
        dailyLimitResetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    });
  }

  const dailySwapLimit = new Decimal(user.dailySwapLimit.toString());
  if (dailySwapUsed.add(decimalAmount).gt(dailySwapLimit)) {
    throw new Error('DAILY_LIMIT_EXCEEDED');
  }

  const sourceWallet = await prisma.wallet.findUnique({
    where: { userId_currency: { userId, currency: fromCurrency } },
  });

  if (!sourceWallet) throw new Error('WALLET_NOT_FOUND');

  const balance = new Decimal(sourceWallet.balance.toString());
  if (balance.lt(decimalAmount)) throw new Error('INSUFFICIENT_BALANCE');

  const rate = await getRate(fromCurrency, toCurrency);
  const fee = decimalAmount.mul(FEE_RATE).toDecimalPlaces(2, Decimal.ROUND_UP);
  const netAmount = decimalAmount.minus(fee);
  const toAmount = netAmount.mul(rate).toDecimalPlaces(2, Decimal.ROUND_DOWN);

  const txRef = `AXP-SWP-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.wallet.update({
      where: { userId_currency: { userId, currency: fromCurrency } },
      data: { balance: { decrement: decimalAmount.toNumber() } },
    });

    await tx.wallet.upsert({
      where: { userId_currency: { userId, currency: toCurrency } },
      create: { userId, currency: toCurrency, balance: toAmount.toNumber() },
      update: { balance: { increment: toAmount.toNumber() } },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: 'SWAP',
        status: 'COMPLETED',
        fromCurrency,
        toCurrency,
        fromAmount: decimalAmount,
        toAmount,
        exchangeRate: rate,
        fee,
        reference: txRef,
        narration: `Swap ${fromCurrency} → ${toCurrency}`,
      },
      });

      await tx.user.update({
        where: { id: userId },
        data: { dailySwapUsed: { increment: decimalAmount.toNumber() } },
      });

      return transaction;
    });

  return {
    transaction: result,
    fromAmount: decimalAmount.toString(),
    toAmount: toAmount.toString(),
    fee: fee.toString(),
    rate: rate.toString(),
  };
}

export async function getTransactions(
  userId: string,
  page: number = 1,
  limit: number = 20,
  type?: string
) {
  const skip = (page - 1) * limit;

  const where: { userId: string; type?: 'DEPOSIT' | 'SWAP' | 'WITHDRAWAL' | 'BILL_PAYMENT' } = { userId };
  if (type && ['DEPOSIT', 'SWAP', 'WITHDRAWAL', 'BILL_PAYMENT'].includes(type)) {
    where.type = type as 'DEPOSIT' | 'SWAP' | 'WITHDRAWAL' | 'BILL_PAYMENT';
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getTransaction(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction || transaction.userId !== userId) {
    throw new Error('TRANSACTION_NOT_FOUND');
  }

  return transaction;
}

export async function completeDeposit(reference: string): Promise<boolean> {
  const transaction = await prisma.transaction.findUnique({
    where: { reference },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
        },
      },
    },
  });

  if (!transaction || transaction.status !== 'PENDING' || transaction.type !== 'DEPOSIT') {
    return false;
  }

  const completed = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const transition = await tx.transaction.updateMany({
      where: { id: transaction.id, status: 'PENDING', type: 'DEPOSIT' },
      data: { status: 'COMPLETED' },
    });
    if (transition.count === 0) return false;

    await tx.wallet.upsert({
      where: {
        userId_currency: {
          userId: transaction.userId,
          currency: transaction.toCurrency,
        },
      },
      create: {
        userId: transaction.userId,
        currency: transaction.toCurrency,
        balance: transaction.toAmount,
      },
      update: {
        balance: { increment: Number(transaction.toAmount) },
      },
    });

    await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        metadata: {
          ...(transaction.metadata &&
          typeof transaction.metadata === 'object' &&
          !Array.isArray(transaction.metadata)
            ? (transaction.metadata as Record<string, unknown>)
            : {}),
          notification: `Deposit of ₦${new Decimal(transaction.toAmount.toString()).toFixed(2)} successful`,
        },
      },
    });

    await tx.notification.create({
      data: {
        userId: transaction.userId,
        type: 'DEPOSIT',
        message: `Deposit of ₦${new Decimal(transaction.toAmount.toString()).toFixed(2)} successful`,
        metadata: { reference: transaction.reference },
      },
    });
    return true;
  });

  if (!completed) return false;

  try {
    await sendDepositConfirmationEmail(
      transaction.user.email,
      transaction.user.firstName,
      new Decimal(transaction.toAmount.toString()).toFixed(2)
    );
  } catch (error) {
    console.error('Deposit confirmation email failed', error);
  }

  return true;
}

export async function verifyDeposit(userId: string, reference: string): Promise<{
  status: 'PAID' | 'PENDING' | 'FAILED';
  amount: string;
  currency: string;
  createdAt: Date;
}> {
  const transaction = await prisma.transaction.findUnique({
    where: { reference },
  });

  if (!transaction || transaction.userId !== userId || transaction.type !== 'DEPOSIT') {
    throw new Error('TRANSACTION_NOT_FOUND');
  }

  if (process.env.NODE_ENV !== 'production') {
    if (transaction.status === 'PENDING') {
      await completeDeposit(reference);
    }
    return {
      status: transaction.status === 'FAILED' ? 'FAILED' : 'PAID',
      amount: new Decimal(transaction.toAmount.toString()).toFixed(2),
      currency: transaction.toCurrency,
      createdAt: transaction.createdAt,
    };
  }

  const amountInKobo = new Decimal(transaction.toAmount.toString()).mul(100).toNumber();
  const requery = await queryTransaction(reference, amountInKobo);
  const status = requery.status;

  if (status === 'PAID' && transaction.status === 'PENDING') {
    await completeDeposit(reference);
    if (requery.cardToken) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          cardToken: requery.cardToken,
          cardTokenizedAt: new Date(),
        },
      });
    }
  }

  return {
    status,
    amount: new Decimal(transaction.toAmount.toString()).toFixed(2),
    currency: transaction.toCurrency,
    createdAt: transaction.createdAt,
  };
}

export async function createRecurringDeposit(
  userId: string,
  amount: number,
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
) {
  const decimalAmount = new Decimal(amount);
  if (decimalAmount.lt(100)) throw new Error('INVALID_AMOUNT');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cardToken: true },
  });
  if (!user?.cardToken) {
    throw new Error('CARD_NOT_TOKENIZED');
  }

  const now = new Date();
  const nextRunAt = new Date(now);
  if (frequency === 'DAILY') nextRunAt.setDate(now.getDate() + 1);
  if (frequency === 'WEEKLY') nextRunAt.setDate(now.getDate() + 7);
  if (frequency === 'MONTHLY') nextRunAt.setMonth(now.getMonth() + 1);

  return prisma.recurringDeposit.create({
    data: {
      userId,
      amount: decimalAmount,
      frequency,
      nextRunAt,
      currency: 'NGN',
    },
  });
}

export async function listRecurringDeposits(userId: string) {
  return prisma.recurringDeposit.findMany({
    where: { userId, isActive: true },
    orderBy: { nextRunAt: 'asc' },
  });
}

export async function cancelRecurringDeposit(userId: string, id: string) {
  const record = await prisma.recurringDeposit.findUnique({ where: { id } });
  if (!record || record.userId !== userId) throw new Error('TRANSACTION_NOT_FOUND');
  return prisma.recurringDeposit.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function requestRefund(userId: string, transactionId: string, reason: string) {
  const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!tx || tx.userId !== userId || tx.type !== 'DEPOSIT' || tx.status !== 'COMPLETED') {
    throw new Error('TRANSACTION_NOT_FOUND');
  }

  const ageMs = Date.now() - tx.createdAt.getTime();
  if (ageMs > 24 * 60 * 60 * 1000) {
    throw new Error('REFUND_WINDOW_EXPIRED');
  }

  const amount = new Decimal(tx.toAmount.toString());
  const wallet = await getWalletByCurrency(userId, tx.toCurrency);
  if (!wallet || new Decimal(wallet.balance.toString()).lt(amount)) {
    throw new Error('INSUFFICIENT_BALANCE');
  }

  await prisma.$transaction(async (db: Prisma.TransactionClient) => {
    await db.wallet.update({
      where: { userId_currency: { userId, currency: tx.toCurrency } },
      data: { balance: { decrement: amount.toNumber() } },
    });
    await db.transaction.update({
      where: { id: tx.id },
      data: { status: 'REFUNDED' },
    });
    await db.notification.create({
      data: {
        userId,
        type: 'REFUND',
        message: `Refund of ₦${amount.toFixed(2)} initiated`,
        metadata: { transactionId: tx.id, reason },
      },
    });
  });

  await initiateRefund(tx.reference || tx.id, amount.mul(100).toNumber(), reason);
  return { message: 'Refund initiated successfully' };
}

export async function createPaymentLink(
  userId: string,
  amount: number,
  description: string,
  expiresAt: Date
) {
  const decimalAmount = new Decimal(amount);
  if (decimalAmount.lte(0)) throw new Error('INVALID_AMOUNT');
  if (expiresAt.getTime() <= Date.now()) throw new Error('INVALID_AMOUNT');

  const created = await createPaymentLinkProvider(userId, amount, description, expiresAt);

  return prisma.paymentLink.create({
    data: {
      userId,
      amount: decimalAmount,
      description,
      reference: created.reference,
      linkUrl: created.linkUrl,
      expiresAt,
    },
  });
}

export async function listPaymentLinks(userId: string) {
  return prisma.paymentLink.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deactivatePaymentLink(userId: string, id: string) {
  const link = await prisma.paymentLink.findUnique({ where: { id } });
  if (!link || link.userId !== userId) throw new Error('TRANSACTION_NOT_FOUND');
  return prisma.paymentLink.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function listBanksCached(params?: { countryCode?: string; currency?: string }) {
  const resolved = resolveCountryAndCurrency({
    countryCode: params?.countryCode,
    currency: params?.currency,
  });

  if (process.env.NODE_ENV !== 'production') {
    return [
      { code: `${resolved.countryCode}001`, name: `${resolved.countryCode} Axios Mock Bank` },
      { code: `${resolved.countryCode}002`, name: `${resolved.countryCode} Sandbox Trust Bank` },
      { code: `${resolved.countryCode}003`, name: `${resolved.countryCode} Demo National Bank` },
    ];
  }
  const cacheKey = `interswitch:banks:v1:${resolved.countryCode}:${resolved.currency}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as Array<{ code: string; name: string }>;
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore cache read issues
  }

  const banks = await getBankList({
    countryCode: resolved.countryCode,
    currency: resolved.currency,
  });
  try {
    await redis.set(cacheKey, JSON.stringify(banks), 'EX', 24 * 60 * 60);
  } catch {
    // ignore cache write issues
  }
  return banks;
}

export async function resolveBankAccount(
  bankCode: string,
  accountNumber: string,
  params?: { countryCode?: string; currency?: string }
) {
  const normalizedAccountNumber = normalizeAccountNumber(accountNumber);
  const resolved = resolveCountryAndCurrency({
    countryCode: params?.countryCode,
    currency: params?.currency,
  });

  if (process.env.NODE_ENV !== 'production') {
    return { accountName: `${resolved.countryCode} Mock User ${normalizedAccountNumber.slice(-4)}` };
  }
  return resolveAccount(bankCode, normalizedAccountNumber, {
    countryCode: resolved.countryCode,
    currency: resolved.currency,
  });
}

export async function withdrawToBank(
  userId: string,
  params: {
    bankCode: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    narration?: string;
    pinToken?: string;
    currency?: string;
    countryCode?: string;
  }
) {
  const amount = new Decimal(params.amount);
  if (amount.lt(1000)) throw new Error('INVALID_AMOUNT');
  await verifyPinToken(userId, params.pinToken);

  const user = await assertTransferCompliance(userId);
  const resolved = resolveCountryAndCurrency({
    countryCode: params.countryCode,
    currency: params.currency,
    fallbackCountry: user.country,
    fallbackCurrency: user.currency,
  });
  const normalizedAccountNumber = normalizeAccountNumber(params.accountNumber);

  const wallet = await getWalletByCurrency(userId, resolved.currency);
  if (!wallet || new Decimal(wallet.balance.toString()).lt(amount)) {
    throw new Error('INSUFFICIENT_BALANCE');
  }

  const txRef = `AXP-WDR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  await prisma.wallet.update({
    where: { userId_currency: { userId, currency: resolved.currency } },
    data: { balance: { decrement: amount.toNumber() } },
  });

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type: 'WITHDRAWAL',
      status: 'PROCESSING',
      fromCurrency: resolved.currency,
      toCurrency: resolved.currency,
      fromAmount: amount,
      toAmount: amount,
      exchangeRate: new Decimal(1),
      fee: new Decimal(0),
      reference: txRef,
      narration: params.narration || 'Wallet withdrawal',
      metadata: {
        countryCode: resolved.countryCode,
        bankCode: params.bankCode,
        accountNumber: normalizedAccountNumber,
        accountName: params.accountName,
      },
    },
  });

  try {
    if (process.env.NODE_ENV !== 'production') {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'COMPLETED' },
      });
      await prisma.notification.create({
        data: {
          userId,
          type: 'WITHDRAWAL',
          message: `Mock withdrawal of ${resolved.currency} ${amount.toFixed(CURRENCY_DECIMAL_PLACES[resolved.currency])} completed`,
          metadata: { reference: txRef, mock: true },
        },
      });
      return { status: 'SUCCESS', reference: txRef, mock: true };
    }
    const transfer = await sendMoney(userId, {
      beneficiaryBankCode: params.bankCode,
      beneficiaryAccountNumber: normalizedAccountNumber,
      beneficiaryAccountName: params.accountName,
      amount: amount.toNumber(),
      narration: params.narration,
      senderName: `${user.firstName} ${user.lastName}`,
      senderCurrency: resolved.currency,
      countryCode: resolved.countryCode,
    });

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: transfer.status === 'SUCCESS' ? 'COMPLETED' : 'FAILED' },
    });

    if (transfer.status !== 'SUCCESS') {
      await prisma.wallet.update({
        where: { userId_currency: { userId, currency: resolved.currency } },
        data: { balance: { increment: amount.toNumber() } },
      });
      await prisma.notification.create({
        data: {
          userId,
          type: 'WITHDRAWAL',
          message: `Withdrawal of ${resolved.currency} ${amount.toFixed(CURRENCY_DECIMAL_PLACES[resolved.currency])} failed and was refunded`,
          metadata: { reference: txRef },
        },
      });
      return { status: 'FAILED', reference: txRef };
    }

    await prisma.notification.create({
      data: {
        userId,
        type: 'WITHDRAWAL',
        message: `Withdrawal of ${resolved.currency} ${amount.toFixed(CURRENCY_DECIMAL_PLACES[resolved.currency])} completed`,
        metadata: { reference: txRef },
      },
    });

    return { status: 'SUCCESS', reference: txRef };
  } catch (error) {
    await prisma.wallet.update({
      where: { userId_currency: { userId, currency: resolved.currency } },
      data: { balance: { increment: amount.toNumber() } },
    });
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'FAILED' },
    });
    throw error;
  }
}

export async function transferToAxiosUser(
  userId: string,
  recipientEmail: string,
  amountValue: number,
  narration?: string,
  pinToken?: string,
  senderCurrency?: string
) {
  const amount = new Decimal(amountValue);
  if (amount.lte(0)) throw new Error('INVALID_AMOUNT');
  await verifyPinToken(userId, pinToken);
  const sender = await assertTransferCompliance(userId);
  const normalizedRecipientEmail = recipientEmail.trim().toLowerCase();
  const currency = senderCurrency
    ? normalizeTransferCurrency(senderCurrency)
    : normalizeTransferCurrency(sender.currency);
  const senderWallet = await getWalletByCurrency(userId, currency);
  if (!senderWallet || new Decimal(senderWallet.balance.toString()).lt(amount)) {
    throw new Error('INSUFFICIENT_BALANCE');
  }
  const recipient = await prisma.user.findUnique({
    where: { email: normalizedRecipientEmail },
    select: { id: true, email: true, currency: true, termsAccepted: true, kycStatus: true, isFrozen: true },
  });
  if (!recipient) throw new Error('USER_NOT_FOUND');
  if (recipient.isFrozen) throw new Error('ACCOUNT_FROZEN');
  if (!recipient.termsAccepted) throw new Error('TERMS_NOT_ACCEPTED');
  if (!['SUBMITTED', 'APPROVED'].includes(recipient.kycStatus)) {
    throw new Error('KYC_REQUIRED');
  }
  if (recipient.id === userId) throw new Error('INVALID_PARAMETERS');

  const recipientCurrency = normalizeTransferCurrency(recipient.currency);
  const exchangeRate =
    currency === recipientCurrency ? new Decimal(1) : await getRate(currency, recipientCurrency);
  const recipientAmount = amount
    .mul(exchangeRate)
    .toDecimalPlaces(CURRENCY_DECIMAL_PLACES[recipientCurrency], Decimal.ROUND_DOWN);

  const reference = `AXP-INT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  await prisma.$transaction(async (db: Prisma.TransactionClient) => {
    await db.wallet.update({
      where: { userId_currency: { userId, currency } },
      data: { balance: { decrement: amount.toNumber() } },
    });
    await db.wallet.upsert({
      where: { userId_currency: { userId: recipient.id, currency: recipientCurrency } },
      create: { userId: recipient.id, currency: recipientCurrency, balance: recipientAmount.toNumber() },
      update: { balance: { increment: recipientAmount.toNumber() } },
    });
    await db.transaction.create({
      data: {
        userId,
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
        fromCurrency: currency,
        toCurrency: recipientCurrency,
        fromAmount: amount,
        toAmount: recipientAmount,
        exchangeRate,
        fee: new Decimal(0),
        reference,
        narration: narration || `Transfer to Axios Pay user ${maskEmail(recipient.email)}`,
        metadata: {
          recipientUserId: recipient.id,
          recipientEmailMasked: maskEmail(recipient.email),
          internalTransfer: true,
          mock: process.env.NODE_ENV !== 'production',
        },
      },
    });
    await db.notification.create({
      data: {
        userId,
        type: 'WITHDRAWAL',
        message: `Transfer of ${currency} ${amount.toFixed(CURRENCY_DECIMAL_PLACES[currency])} to ${maskEmail(recipient.email)} completed`,
        metadata: { reference, internalTransfer: true },
      },
    });
    await db.notification.create({
      data: {
        userId: recipient.id,
        type: 'DEPOSIT',
        message: `You received ${recipientCurrency} ${recipientAmount.toFixed(CURRENCY_DECIMAL_PLACES[recipientCurrency])} from ${maskEmail(sender.email)}`,
        metadata: {
          reference,
          internalTransfer: true,
          senderUserId: sender.id,
          senderEmailMasked: maskEmail(sender.email),
          senderCurrency: currency,
          recipientCurrency,
          exchangeRate: exchangeRate.toString(),
        },
      },
    });
  });

  return {
    status: 'SUCCESS',
    reference,
    senderCurrency: currency,
    recipientCurrency,
    senderAmount: amount.toString(),
    recipientAmount: recipientAmount.toString(),
    exchangeRate: exchangeRate.toString(),
    mock: process.env.NODE_ENV !== 'production',
  };
}

export async function generatePaycode(userId: string, amountValue: number) {
  const amount = new Decimal(amountValue);
  if (amount.lte(0)) throw new Error('INVALID_AMOUNT');
  const wallet = await getWalletByCurrency(userId, 'NGN');
  if (!wallet || new Decimal(wallet.balance.toString()).lt(amount)) {
    throw new Error('INSUFFICIENT_BALANCE');
  }

  const code = (parseInt(crypto.randomBytes(4).toString('hex'), 16) % 900000 + 100000).toString();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.$transaction(async (db: Prisma.TransactionClient) => {
    await db.wallet.update({
      where: { userId_currency: { userId, currency: 'NGN' } },
      data: { balance: { decrement: amount.toNumber() } },
    });
    await db.transaction.create({
      data: {
        userId,
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
        fromCurrency: 'NGN',
        toCurrency: 'NGN',
        fromAmount: amount,
        toAmount: amount,
        exchangeRate: new Decimal(1),
        fee: new Decimal(0),
        reference: `AXP-PC-${Date.now()}-${code}`,
        narration: 'Cash-out paycode generation',
      },
    });
    await db.notification.create({
      data: {
        userId,
        type: 'PAYCODE',
        message: `Paycode for ₦${amount.toFixed(2)} generated`,
      },
    });
  });

  return prisma.paycode.create({
    data: {
      userId,
      amount,
      code,
      expiresAt,
    },
  });
}

export async function listPaycodes(userId: string) {
  return prisma.paycode.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}
