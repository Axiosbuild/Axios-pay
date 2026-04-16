import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(
  email: string,
  token: string,
  otp: string
) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${token}`;

  try {
    const res = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Verify your AxiosPay account',
      html: `
        <div style="font-family:sans-serif">
          <h2>Welcome to AxiosPay</h2>

          <p>Use this OTP to verify your account:</p>
          <h1 style="letter-spacing:5px;">${otp}</h1>

          <p>Or click the link below:</p>
          <a href="${verificationUrl}"
             style="background:black;color:white;padding:10px 20px;text-decoration:none;">
             Verify Account
          </a>

          <p>This OTP and link expire in 10 minutes.</p>
        </div>
      `,
    });

    console.log('Email sent:', res);
  } catch (error) {
    console.error('Resend error:', error);
    throw error;
  }
}
