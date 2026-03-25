'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { OTPInput } from '@/components/ui/OTPInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function VerifyPhonePage() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

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
      await api.auth.verifyPhone({ userId, otp });
      localStorage.removeItem('axiospay_pending_userId');
      router.push('/login?verified=1');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      const code = e?.response?.data?.error || '';
      setError(code === 'OTP_EXPIRED' ? 'Code expired.' : 'Invalid code.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">📱</div>
        <h2 className="font-display text-xl font-semibold text-text-primary">Verify your phone</h2>
        <p className="text-sm text-text-muted mt-2">Enter the 6-digit code for your phone number.</p>
        <p className="text-xs text-text-muted mt-2 bg-brand-bg rounded-btn p-2">
          💡 In development mode, your OTP was logged to the API server console.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-error text-center">{error}</div>
      )}

      <OTPInput value={otp} onChange={setOtp} />

      <Button onClick={handleVerify} loading={loading} disabled={otp.length !== 6} className="w-full mt-6">
        Verify Phone
      </Button>
    </Card>
  );
}
