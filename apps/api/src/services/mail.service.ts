import { sendSmtpEmail } from '../config/mailer';
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
    await sendSmtpEmail({
      from: EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    console.log('[SMTP] Email sent', { to: input.to, subject: input.subject });
  } catch (error) {
    console.error('[SMTP] Failed to send email', {
      to: input.to,
      subject: input.subject,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
