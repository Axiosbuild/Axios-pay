'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { OTPInput } from '@/components/ui/OTPInput';
import { Button } from '@/components/ui/Button';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const onboardingToken = searchParams.get('onboardingToken') ?? '';
  const token = searchParams.get('token') ?? '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!email || !token) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    api.auth
      .verifyEmail({ email, token })
      .then(() => {
        if (cancelled) return;
        setVerified(true);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Verification link is invalid or expired. Enter your code instead.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [email, token]);

  useEffect(() => {
    if (!verified || !onboardingToken) return;
    router.push(`/terms?token=${encodeURIComponent(onboardingToken)}`);
  }, [verified, onboardingToken, router]);

  async function handleVerifyCode() {
    if (!email || otp.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      await api.auth.verifyEmail({ email, otp });
      setVerified(true);
    } catch {
      setError('Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) return;
    setLoading(true);
    setError('');
    setResendMessage('');
    try {
      await api.auth.resendVerificationEmail({ email });
      setResendMessage('A new verification code has been sent.');
    } catch {
      setError('Could not resend verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!email || !onboardingToken) {
    return (
      <Card>
        <h2 className="font-display text-xl font-semibold text-text-primary mb-3">Invalid verification session</h2>
        <p className="text-sm text-text-muted">Please register again to continue.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-display text-xl font-semibold text-text-primary mb-2">Verify your email</h2>
      <p className="text-sm text-text-muted mb-6">
        Enter the 6-digit code sent to <strong>{email}</strong>.
      </p>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-error">{error}</div>}
      {resendMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-btn text-sm text-emerald-700">
          {resendMessage}
        </div>
      )}
      <OTPInput value={otp} onChange={setOtp} />
      <div className="mt-4 space-y-3">
        <Button
          onClick={handleVerifyCode}
          loading={loading}
          disabled={loading || otp.length !== 6}
          className="w-full"
        >
          Verify Email
        </Button>
        <Button
          onClick={handleResend}
          loading={loading}
          disabled={loading}
          variant="secondary"
          className="w-full"
        >
          Resend Code
        </Button>
      </div>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Card>Loading...</Card>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
