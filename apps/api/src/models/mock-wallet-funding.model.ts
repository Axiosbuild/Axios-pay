export interface WalletRecord {
  userId: string;
  balance: number;
  currency: 'NGN';
}

export interface FundingTransactionRecord {
  reference: string;
  amount: number;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  userId: string;
  email: string;
  paymentUrl: string;
  providerResponse?: unknown;
  createdAt: string;
  updatedAt: string;
}

const wallets: WalletRecord[] = [];
const transactions: FundingTransactionRecord[] = [];

export function resolveUserIdFromEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getOrCreateWallet(userId: string): WalletRecord {
  const existing = wallets.find((wallet) => wallet.userId === userId);
  if (existing) return existing;

  const created: WalletRecord = {
    userId,
    balance: 0,
    currency: 'NGN',
  };
  wallets.push(created);
  return created;
}

export function createPendingFundingTransaction(params: {
  reference: string;
  amount: number;
  userId: string;
  email: string;
  paymentUrl: string;
  providerResponse?: unknown;
}): FundingTransactionRecord {
  const timestamp = new Date().toISOString();
  const record: FundingTransactionRecord = {
    reference: params.reference,
    amount: params.amount,
    status: 'PENDING',
    userId: params.userId,
    email: params.email,
    paymentUrl: params.paymentUrl,
    providerResponse: params.providerResponse,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  transactions.push(record);
  return record;
}

export function getFundingTransaction(reference: string): FundingTransactionRecord | undefined {
  return transactions.find((transaction) => transaction.reference === reference);
}

export function markFundingTransactionSuccessful(
  reference: string
): { transaction: FundingTransactionRecord; wasAlreadySuccessful: boolean } | null {
  const transaction = getFundingTransaction(reference);
  if (!transaction) return null;

  if (transaction.status === 'SUCCESSFUL') {
    return { transaction, wasAlreadySuccessful: true };
  }

  transaction.status = 'SUCCESSFUL';
  transaction.updatedAt = new Date().toISOString();
  return { transaction, wasAlreadySuccessful: false };
}

export function markFundingTransactionFailed(reference: string): FundingTransactionRecord | null {
  const transaction = getFundingTransaction(reference);
  if (!transaction) return null;

  transaction.status = 'FAILED';
  transaction.updatedAt = new Date().toISOString();
  return transaction;
}

export function creditWalletBalance(userId: string, amount: number): WalletRecord {
  const wallet = getOrCreateWallet(userId);
  wallet.balance += amount;
  return wallet;
}
