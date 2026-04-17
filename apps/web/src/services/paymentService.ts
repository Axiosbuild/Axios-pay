import { apiClient, fundingClient } from '@/lib/api';

/**
 * Request OTP for payment verification via Interswitch
 */
export async function requestPaymentOTP(params: {
  customerPhone: string;
  transactionReference: string;
  amount: number;
}): Promise<{
  sessionToken: string;
  message: string;
  expiresInSeconds: number;
}> {
  const response = await apiClient.post('/otp/request', params);
  return response.data;
}

/**
 * Verify OTP code sent to user's phone
 */
export async function verifyPaymentOTP(params: {
  sessionToken: string;
  otp: string;
  transactionReference: string;
}): Promise<{
  verified: boolean;
  transferToken: string;
  message: string;
}> {
  const response = await apiClient.post('/otp/verify', params);
  return response.data;
}

/**
 * Resend OTP to user's phone
 */
export async function resendPaymentOTP(params: {
  sessionToken?: string;
  customerPhone: string;
  transactionReference: string;
  amount: number;
}): Promise<{
  sessionToken: string;
  message: string;
  expiresInSeconds: number;
}> {
  const response = await apiClient.post('/otp/resend', params);
  return response.data;
}

/**
 * Initiate payment after OTP verification
 */
export async function initiatePayment(params: {
  amount: number;
  transferToken: string;
  transactionReference: string;
}): Promise<{ paymentUrl: string; reference: string }> {
  const response = await apiClient.post('/wallets/deposit/initiate', params);
  return {
    paymentUrl: response.data.paymentUrl,
    reference: response.data.reference,
  };
}

/**
 * Verify payment status after processing
 */
export async function verifyPaymentStatus(reference: string): Promise<{ status: string }> {
  const response = await apiClient.get(`/wallets/deposit/verify/${reference}`);
  return {
    status: response.data.status,
  };
}

/**
 * Fund wallet via gateway (public endpoint, no auth required)
 */
export async function fundWalletViaGateway(params: {
  amount: number;
  email: string;
}): Promise<{ transactionReference: string; paymentUrl: string }> {
  const response = await fundingClient.post('/wallet-funding/fund-wallet', params);
  return {
    transactionReference: response.data.transactionReference,
    paymentUrl: response.data.paymentUrl,
  };
}

/**
 * Get wallet balance after funding
 */
export async function getWalletBalance(email: string): Promise<{ balance: number }> {
  const response = await fundingClient.get('/wallet-funding/wallet-balance', {
    params: { email },
  });
  return {
    balance: Number(response.data.balance ?? 0),
  };
}

