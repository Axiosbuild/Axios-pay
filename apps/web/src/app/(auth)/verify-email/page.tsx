'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { OTPInput } from '@/components/ui/OTPInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function VerifyEmailPage() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (otp.length === 6) handleVerify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  async function handleVerify() {
    const userId = localStorage.getItem('axiospay_pending_userId');
    if (!userId) { router.push('/register'); return; }
    setLoading(true);
    setError('');
    try {
      await api.auth.verifyEmail({ userId, otp });
      router.push('/verify-phone');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      const code = e?.response?.data?.error || '';
      setError(code === 'OTP_EXPIRED' ? 'Code expired. Please request a new one.' : 'Invalid code. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    const userId = localStorage.getItem('axiospay_pending_userId');
    if (!userId) return;
    try {
      await api.auth.resendOTP({ userId });
      setCooldown(60);
    } catch {
      setError('Failed to resend code.');
    }
  }

  return (
    <Card>
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">📧</div>
        <h2 className="font-display text-xl font-semibold text-text-primary">Check your email</h2>
        <p className="text-sm text-text-muted mt-2">We sent a 6-digit code to your email address.</p>
        <p className="text-xs text-text-muted mt-1">Check your spam folder if you don&apos;t see it.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-error text-center">{error}</div>
      )}

      <OTPInput value={otp} onChange={setOtp} />

      <Button onClick={handleVerify} loading={loading} disabled={otp.length !== 6} className="w-full mt-6">
        Verify Email
      </Button>

      <div className="text-center mt-4">
        {cooldown > 0 ? (
          <p className="text-sm text-text-muted">Resend in {cooldown}s</p>
        ) : (
          <button onClick={handleResend} className="text-sm text-brand-amber hover:underline">
            Resend code
          </button>
        )}
      </div>
    </Card>
  );
}
