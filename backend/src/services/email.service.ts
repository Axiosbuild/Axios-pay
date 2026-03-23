import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const template = (title: string, body: string) => `
<div style="font-family:'Cabinet Grotesk',Arial,sans-serif;background:#0A2318;color:#F7F7F4;padding:24px;">
  <div style="max-width:580px;margin:0 auto;border:1px solid #2D9E6B;background:#123b2a;padding:24px;border-radius:12px;">
    <h2 style="margin:0 0 16px;color:#F0A832;font-family:'Clash Display',Arial,sans-serif;">${title}</h2>
    ${body}
    <p style="margin-top:24px;color:#d6f3e5">Axios Pay Team</p>
  </div>
</div>`;

export const emailService = {
  sendVerificationEmail: async (email: string, firstName: string, code: string) => transporter.sendMail({
    to: email,
    from: process.env.EMAIL_FROM || 'no-reply@axiospay.africa',
    subject: 'Verify your Axios Pay account',
    html: template('Email Verification', `<p>Hello ${firstName},</p><p>Your verification code is <strong>${code}</strong>.</p>`),
  }),
  sendPasswordResetEmail: async (email: string, firstName: string, code: string) => transporter.sendMail({
    to: email,
    from: process.env.EMAIL_FROM || 'no-reply@axiospay.africa',
    subject: 'Reset your Axios Pay password',
    html: template('Password Reset', `<p>Hello ${firstName},</p><p>Your password reset code is <strong>${code}</strong>.</p>`),
  }),
  sendTransactionReceipt: async (email: string, payload: { reference: string; amount: string; currency: string; type: string; date: string }) => transporter.sendMail({
    to: email,
    from: process.env.EMAIL_FROM || 'no-reply@axiospay.africa',
    subject: `Transaction Receipt ${payload.reference}`,
    html: template('Transaction Receipt', `<p>Reference: <strong>${payload.reference}</strong></p><p>Type: ${payload.type}</p><p>Amount: <strong>${payload.currency} ${payload.amount}</strong></p><p>Date: ${payload.date}</p>`),
  }),
};
