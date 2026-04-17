import { sendResendEmail } from '../config/mailer';
import { env } from '../config/env';

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const EMAIL_FROM = `"AxiosPay" <${env.EMAIL_FROM ?? 'info@axiospay.space'}>`;

export async function sendMail(input: SendMailInput): Promise<void> {
  try {
    await sendResendEmail({
      from: EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    console.log('[Resend] Sent to:', input.to);
  } catch (error) {
    console.error('[Resend] Failed:', error);
    throw error;
  }
}
