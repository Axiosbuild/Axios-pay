import { transporter } from '../config/mailer';
import { env } from '../config/env';

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const EMAIL_FROM = `"AxiosPay" <${env.SMTP_USER}>`;

export async function sendMail(input: SendMailInput): Promise<void> {
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    console.log('[SMTP] Sent to:', input.to);
  } catch (error) {
    console.error('[SMTP] Failed:', error);
    throw error;
  }
}
