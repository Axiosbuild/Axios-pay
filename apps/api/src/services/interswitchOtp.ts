import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { getInterswitchToken } from './interswitchAuth';

export interface OtpRequestResult {
  sessionToken: string;
  message: string;
}

export async function requestInterswitchOtp(params: {
  customerPhone: string;
  transactionReference: string;
  amount: number;
}): Promise<OtpRequestResult> {
  const token = await getInterswitchToken();

  const { data } = await axios.post(
    `${env.INTERSWITCH_BASE_URL}/api/v2/quickteller/payments/otp/generate`,
    {
      transactionReference: params.transactionReference,
      amount: params.amount,
      phoneNumber: params.customerPhone,
      notifyByPhone: true,
      notifyByEmail: false,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Nonce: uuidv4(),
        Timestamp: Date.now().toString(),
      },
    }
  );

  if (!data?.otpId && !data?.sessionToken) {
    throw new Error(`[Interswitch OTP] Unexpected response: ${JSON.stringify(data)}`);
  }

  return {
    sessionToken: data.otpId ?? data.sessionToken,
    message: data.message ?? 'OTP sent successfully.',
  };
}

export async function validateInterswitchOtp(params: {
  sessionToken: string;
  otp: string;
  transactionReference: string;
}): Promise<boolean> {
  const token = await getInterswitchToken();

  const { data } = await axios.post(
    `${env.INTERSWITCH_BASE_URL}/api/v2/quickteller/payments/otp/validate`,
    {
      otpId: params.sessionToken,
      otp: params.otp,
      transactionReference: params.transactionReference,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Nonce: uuidv4(),
        Timestamp: Date.now().toString(),
      },
    }
  );

  return data?.responseCode === '00';
}
