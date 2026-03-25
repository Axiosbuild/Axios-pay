'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { SwapWidget } from '@/components/ui/SwapWidget';

interface SwapResult {
  fromAmount: string;
  fromCurrency: string;
  toAmount: string;
  toCurrency: string;
}

export default function SwapPage() {
  const [success, setSuccess] = useState<SwapResult | null>(null);
  const queryClient = useQueryClient();

  function handleSwap(result: unknown) {
    const r = result as SwapResult;
    setSuccess(r);
    queryClient.invalidateQueries({ queryKey: ['wallets'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold text-text-primary mb-6">Currency Swap</h1>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-card">
          <p className="text-success font-semibold">✅ Swap successful!</p>
          <p className="text-sm text-text-secondary mt-1">
            {success.fromAmount} {success.fromCurrency} → {success.toAmount} {success.toCurrency}
          </p>
          <button onClick={() => setSuccess(null)} className="text-sm text-text-muted hover:text-text-primary mt-2">
            Make another swap
          </button>
        </div>
      )}

      <Card>
        <SwapWidget onSwap={handleSwap} />
      </Card>
    </div>
  );
}
