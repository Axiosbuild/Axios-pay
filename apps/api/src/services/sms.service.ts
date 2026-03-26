import twilio from 'twilio';
import { env } from '../config/env';

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export async function sendPhoneOTP(to: string, otp: string): Promise<void> {
  await client.messages.create({
    body: `Your Axios Pay verification code is: ${otp}. Valid for 10 minutes.`,
    from: env.TWILIO_PHONE_NUMBER,
    to,
  });
}
