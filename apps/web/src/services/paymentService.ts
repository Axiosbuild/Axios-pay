import { api } from '@/lib/api';

export async function initiateCheckout(params: {
  amount: number;
  transferToken: string;
  transactionReference: string;
}): Promise<{ paymentUrl: string; reference: string }> {
  const response = await api.wallets.initiateDeposit(params);
  return {
    paymentUrl: response.data.paymentUrl,
    reference: response.data.reference,
  };
}

export async function verifyTransaction(reference: string): Promise<{ status: string }> {
  const response = await api.wallets.verifyDeposit(reference);
  return {
    status: response.data.status,
  };
}
