'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const email = useMemo(
    () => searchParams.get('email') || 'demo.user@example.com',
    [searchParams]
  );

  useEffect(() => {
    let active = true;

    async function fetchBalance() {
      setLoading(true);
      setError('');

      try {
        const response = await api.funding.getWalletBalance(email);
        if (!active) return;
        setBalance(Number(response.data?.balance ?? 0));
      } catch (err: unknown) {
        if (!active) return;
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        setError(e?.response?.data?.message || e?.message || 'Failed to fetch wallet balance.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchBalance();

    return () => {
      active = false;
    };
  }, [email]);

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-success">Payment Successful</h1>
      <p className="text-sm text-text-secondary">Your wallet has been updated after confirmation.</p>
      <p className="text-xs text-text-muted break-all">Wallet owner: {email}</p>

      {loading && <p className="text-sm text-text-secondary">Fetching latest wallet balance...</p>}
      {error && <p className="text-sm text-error">{error}</p>}
      {balance !== null && !loading && (
        <p className="text-lg font-medium">Updated Balance: ₦{balance.toFixed(2)}</p>
      )}
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto p-6 text-sm text-text-secondary">Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
