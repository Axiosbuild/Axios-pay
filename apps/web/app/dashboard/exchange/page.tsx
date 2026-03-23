'use client';

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { apiClient } from '@/lib/api-client';

export default function ExchangePage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fromCurrency, setFromCurrency] = useState('NGN');
  const [toCurrency, setToCurrency] = useState('KES');
  const [fromAmount, setFromAmount] = useState('10000');
  const [quote, setQuote] = useState<any>(null);
  const [seconds, setSeconds] = useState(30);
  const [result, setResult] = useState<any>(null);

  const requestQuote = async () => {
    const res = await apiClient.get('/fx/quote', { params: { from: fromCurrency, to: toCurrency, amount: fromAmount, direction: 'send' } });
    setQuote(res.data.quote);
    setStep(2);
    setSeconds(30);
  };

  useEffect(() => {
    if (step !== 2) return;
    if (seconds <= 0) {
      setStep(1);
      return;
    }
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, step]);

  const confirmSwap = async () => {
    const res = await apiClient.post('/transactions/swap', {
      quoteId: quote.quoteId,
      fromCurrency,
      toCurrency,
      fromAmount: Number(fromAmount),
    });
    setResult(res.data.transaction);
    setStep(3);
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.65 } });
  };

  return (
    <main className="min-h-screen bg-green-900 text-white px-6 py-10">
      <div className="max-w-2xl mx-auto glass rounded-2xl p-8">
        <h1 className="font-display text-4xl text-gold-400">Currency exchange</h1>
        <p className="text-white/70 mt-1">Configure → Quote countdown → Success</p>

        {step === 1 && (
          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input className="bg-black/20 rounded p-3" value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value.toUpperCase())} />
              <input className="bg-black/20 rounded p-3" value={toCurrency} onChange={(e) => setToCurrency(e.target.value.toUpperCase())} />
            </div>
            <input className="w-full bg-black/20 rounded p-3 amount" value={fromAmount} onChange={(e) => setFromAmount(e.target.value)} />
            <button className="w-full py-3 rounded bg-green-400 text-green-900 font-semibold" onClick={requestQuote}>Get 30s quote</button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4">
            <div className="bg-black/20 rounded p-4">
              <p>Quote: {quote?.quoteId}</p>
              <p className="amount mt-2">Rate: {Number(quote?.rate || 0).toFixed(4)}</p>
              <p className="amount">Receive: {Number(quote?.toAmount || 0).toLocaleString()} {toCurrency}</p>
            </div>
            <div className="text-center">
              <p className="text-white/70">Expires in</p>
              <p className="font-display text-5xl text-gold-400">{seconds}s</p>
            </div>
            <button className="w-full py-3 rounded bg-gold-400 text-green-900 font-semibold" onClick={confirmSwap}>Confirm swap</button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-8 text-center">
            <h2 className="font-display text-3xl text-green-400">Swap successful</h2>
            <p className="mt-2">Reference: {result?.reference || result?.id}</p>
          </div>
        )}
      </div>
    </main>
  );
}
