import { env } from './env';

export interface ResendMailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendResendEmail(options: ResendMailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY ?? env.RESEND_API_KEY;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: options.from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      ...(options.text ? { text: options.text } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`[Resend] HTTP ${response.status}: ${body}`);
  }

  const data = await response.json() as { id?: string };
  console.log('[Resend] Email sent, id:', data.id);
}

/** No-op kept for startup compatibility — SMTP verification is no longer needed. */
export async function verifySmtpTransport(): Promise<void> {
  console.log('[Resend] HTTP transport active — no SMTP verification required');
}
