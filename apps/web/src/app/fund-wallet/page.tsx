'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function FundWalletPage() {
  const [amount, setAmount] = useState<string>('1000');
  const [email, setEmail] = useState<string>('demo.user@example.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFundWallet() {
    setLoading(true);
    setError('');

    try {
      const amountValue = Number(amount);
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        setError('Please enter a valid positive numeric amount.');
        return;
      }
      if (amountValue < 100) {
        setError('Please enter an amount of at least ₦100.');
        return;
      }

      const response = await api.funding.fundWallet({ amount: amountValue, email });
      const paymentUrl = response.data?.paymentUrl as string | undefined;
      if (!paymentUrl) {
        setError('Payment URL was not returned by the server.');
        return;
      }

      window.location.href = paymentUrl;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e?.message || 'Failed to initialize funding.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Fund Wallet</h1>
      <p className="text-sm text-text-secondary">
        Enter amount and email, then continue to Interswitch payment page.
      </p>

      <div className="space-y-1">
        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2.5"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Amount (NGN)</label>
        <input
          type="number"
          min={100}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2.5"
          placeholder="1000"
        />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <button
        type="button"
        onClick={handleFundWallet}
        disabled={loading}
        className="w-full rounded-btn bg-brand-amber text-white py-2.5 disabled:opacity-60"
      >
        {loading ? 'Initializing Payment...' : 'Fund Wallet'}
      </button>
    </main>
  );
}
