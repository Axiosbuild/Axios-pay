import { Resend } from 'resend';
import { env } from './env';

const resend = new Resend(env.RESEND_API_KEY);

export interface ResendMailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendResendEmail(options: ResendMailOptions): Promise<void> {
  const to = Array.isArray(options.to) ? options.to : [options.to];

  const { data, error } = await resend.emails.send({
    from: options.from,
    to,
    subject: options.subject,
    html: options.html,
    ...(options.text ? { text: options.text } : {}),
  });

  if (error) {
    throw new Error(`[Resend] ${error.name}: ${error.message}`);
  }

  console.log('[Resend] Email sent, id:', data?.id);
}

/** No-op kept for startup compatibility — Resend SDK requires no connection verification. */
export async function verifySmtpTransport(): Promise<void> {
  console.log('[Resend] SDK transport active — no connection verification required');
}
