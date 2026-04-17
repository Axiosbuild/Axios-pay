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
  } catch (error) {
    const smtpError = error as Partial<{
      message: string;
      code: string;
      command: string;
      response: string;
      responseCode: number;
    }>;

    console.error('SMTP send failed', {
      to: input.to,
      subject: input.subject,
      message: smtpError.message || 'Unknown SMTP send error',
      code: smtpError.code,
      command: smtpError.command,
      response: smtpError.response,
      responseCode: smtpError.responseCode,
    });
    throw error;
  }
}
