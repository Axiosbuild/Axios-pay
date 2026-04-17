interface VerificationEmailTemplateInput {
  firstName: string;
  verificationLink: string;
  verificationCode: string;
  expiryMinutes: number;
}

export function buildVerificationEmailTemplate(input: VerificationEmailTemplateInput): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Verify your AxiosPay account';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px;">
      <h1 style="margin: 0 0 8px; color: #1A2332;">AxiosPay</h1>
      <p style="margin: 0 0 24px; color: #5A6474;">Hi ${input.firstName}, verify your email to activate your account.</p>
      <a href="${input.verificationLink}" style="display: inline-block; padding: 12px 24px; border-radius: 8px; text-decoration: none; background: #C8772A; color: #ffffff; font-weight: 600;">
        Verify Email
      </a>
      <p style="margin: 20px 0 4px; color: #5A6474;">Or use this link:</p>
      <p style="margin: 0 0 20px;"><a href="${input.verificationLink}" style="color: #C8772A;">${input.verificationLink}</a></p>
      <p style="margin: 0 0 8px; color: #5A6474;">Or enter this 6-digit code:</p>
      <div style="font-family: monospace; font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #1A2332; margin: 0 0 16px;">
        ${input.verificationCode}
      </div>
      <p style="margin: 0; color: #5A6474;">This link and code expire in ${input.expiryMinutes} minutes.</p>
    </div>
  `;

  const text = `Hi ${input.firstName},

Verify your AxiosPay account.

Verification link: ${input.verificationLink}
Verification code: ${input.verificationCode}

This link and code expire in ${input.expiryMinutes} minutes.
`;

  return { subject, html, text };
}
