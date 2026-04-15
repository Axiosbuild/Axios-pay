import axios, { AxiosError } from 'axios';
import { Buffer } from 'node:buffer';
import { env } from '../config/env';

interface OAuthTokenResponse {
  access_token: string;
  expires_in?: number;
}

interface InterswitchInitResponse {
  paymentUrl?: string;
  paymentLink?: string;
  checkoutUrl?: string;
  data?: {
    paymentUrl?: string;
    paymentLink?: string;
    checkoutUrl?: string;
  };
}

const QUICKTELLER_COLLECTION_PATHS = [
  '/collections/api/v1/getcheckouturl',
  '/collections/api/v1/getcheckupurl',
];

function sanitizeApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const e = error as AxiosError;
    return {
      status: e.response?.status,
      data: e.response?.data,
      message: e.message,
      code: e.code,
    };
  }
  return { message: error instanceof Error ? error.message : 'Unknown error' };
}

function validateSandboxCredentials(): void {
  const missing: string[] = [];
  if (!env.INTERSWITCH_CLIENT_ID || env.INTERSWITCH_CLIENT_ID.startsWith('placeholder')) {
    missing.push('INTERSWITCH_CLIENT_ID');
  }
  if (!env.INTERSWITCH_CLIENT_SECRET || env.INTERSWITCH_CLIENT_SECRET.startsWith('placeholder')) {
    missing.push('INTERSWITCH_CLIENT_SECRET');
  }
  if (!env.INTERSWITCH_MERCHANT_CODE || env.INTERSWITCH_MERCHANT_CODE.startsWith('placeholder')) {
    missing.push('INTERSWITCH_MERCHANT_CODE');
  }
  if (!env.INTERSWITCH_PAY_ITEM_ID || env.INTERSWITCH_PAY_ITEM_ID.startsWith('placeholder')) {
    missing.push('INTERSWITCH_PAY_ITEM_ID');
  }
  if (missing.length > 0) {
    throw new Error(`Missing valid Interswitch sandbox credentials: ${missing.join(', ')}`);
  }
}

export async function generateInterswitchOAuthToken(): Promise<string> {
  validateSandboxCredentials();
  const baseUrl = env.BASE_URL || env.INTERSWITCH_BASE_URL;
  const credentials = Buffer.from(
    `${env.INTERSWITCH_CLIENT_ID}:${env.INTERSWITCH_CLIENT_SECRET}`
  ).toString('base64');

  try {
    const response = await axios.post<OAuthTokenResponse>(
      `${baseUrl}/passport/oauth/token`,
      'grant_type=client_credentials',
      {
        timeout: 20000,
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.info('[WalletFunding][Interswitch OAuth] response', {
      status: response.status,
      data: response.data,
    });

    if (!response.data.access_token) {
      throw new Error('Missing access token from Interswitch');
    }

    return response.data.access_token;
  } catch (error) {
    console.error('[WalletFunding][Interswitch OAuth] failed', sanitizeApiError(error));
    throw new Error('INTERNAL_PAYMENT_AUTH_ERROR');
  }
}

export async function initializeInterswitchPayment(params: {
  amount: number;
  email: string;
  transactionReference: string;
  redirectUrl: string;
}): Promise<{ paymentUrl: string; rawResponse: unknown }> {
  const baseUrl = env.BASE_URL || env.INTERSWITCH_BASE_URL;
  const oauthToken = await generateInterswitchOAuthToken();
  const amountInKobo = Math.round(params.amount * 100);

  let lastError: unknown;

  for (const endpoint of QUICKTELLER_COLLECTION_PATHS) {
    try {
      const response = await axios.post<InterswitchInitResponse>(
        `${baseUrl}${endpoint}`,
        {
          amount: amountInKobo,
          transactionReference: params.transactionReference,
          customerEmail: params.email,
          currencyCode: '566',
          redirectUrl: params.redirectUrl,
          merchantCode: env.INTERSWITCH_MERCHANT_CODE,
          payableCode: env.INTERSWITCH_PAY_ITEM_ID,
          description: 'Wallet funding transaction',
        },
        {
          timeout: 25000,
          headers: {
            Authorization: `Bearer ${oauthToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.info('[WalletFunding][Interswitch Init] response', {
        endpoint,
        status: response.status,
        data: response.data,
      });

      const paymentUrl =
        response.data.paymentUrl ??
        response.data.paymentLink ??
        response.data.checkoutUrl ??
        response.data.data?.paymentUrl ??
        response.data.data?.paymentLink ??
        response.data.data?.checkoutUrl;

      if (!paymentUrl) {
        throw new Error('Interswitch did not return paymentUrl');
      }

      return { paymentUrl, rawResponse: response.data };
    } catch (error) {
      lastError = error;
      console.error('[WalletFunding][Interswitch Init] failed', {
        endpoint,
        error: sanitizeApiError(error),
      });
    }
  }

  throw new Error(
    lastError instanceof Error ? lastError.message : 'INTERNAL_PAYMENT_INITIALIZATION_ERROR'
  );
}
