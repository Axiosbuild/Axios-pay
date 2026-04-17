'use client';

import { useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PILOT_COUNTRIES } from '@/lib/countries';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function FundWalletPage() {
  const { user } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedCountry = useMemo(
    () => PILOT_COUNTRIES.find((country) => country.currency === currency) ?? PILOT_COUNTRIES[0],
    [currency]
  );

  async function handleFund() {
    if (!user?.id) {
      setError('You must be signed in to fund your wallet.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API}/api/funding/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: Number(amount),
          currency,
          countryCode: selectedCountry.code,
        }),
      });

      const data = (await response.json()) as { error?: string; redirectUrl?: string };
      if (!response.ok || !data.redirectUrl) {
        throw new Error(data.error || 'Funding failed.');
      }

      window.location.href = data.redirectUrl;
    } catch (err) {
      const errorValue = err as Error;
      setError(errorValue.message || 'Funding failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 px-4">
      <Card>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Fund Wallet</h1>
        <p className="text-gray-500 text-sm mb-6">Add money to your Axios Pay wallet instantly.</p>

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-1">Currency</label>
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PILOT_COUNTRIES.map((country) => (
              <option key={country.currency} value={country.currency}>
                {country.flag} {country.currency} - {country.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label={`Amount (${selectedCountry.currencySymbol})`}
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder={`e.g. ${currency === 'NGN' ? '5000' : '500'}`}
          error={error}
        />

        {amount && Number(amount) > 0 ? (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            You are funding <strong>{selectedCountry.currencySymbol}{Number(amount).toLocaleString()}</strong> to your {currency} wallet.
          </div>
        ) : null}

        <Button className="w-full mt-6" onClick={handleFund} loading={loading} disabled={!amount || Number(amount) <= 0}>
          Proceed to Payment
        </Button>
      </Card>
    </div>
  );
}
