'use client';

import { useMemo, useState } from 'react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';

const PRINCIPAL_USD = 125;
const FX_RATE = 1542.35;
const MERCHANT_NAME = 'Atlantic Travel Hub';

export function PaymentView() {
  const [isPaying, setIsPaying] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);

  const finalNgnAmount = useMemo(() => PRINCIPAL_USD * FX_RATE, []);

  const handlePay = () => {
    setIsPaying(true);
    setIsPaymentComplete(false);

    window.setTimeout(() => {
      setIsPaying(false);
      setIsPaymentComplete(true);
    }, 1800);
  };

  return (
    <div className="h-full p-5 pb-28">
      <div className="rounded-3xl bg-navy p-6 text-white shadow-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">Cross-Border Checkout</p>
        <h1 className="mt-2 font-display text-3xl">Payment Summary</h1>

        <div className="mt-6 space-y-4 rounded-2xl bg-white/10 p-4">
          <div className="flex items-center justify-between border-b border-white/15 pb-3">
            <span className="text-sm text-white/70">Merchant</span>
            <span className="font-semibold">{MERCHANT_NAME}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/15 pb-3">
            <span className="text-sm text-white/70">Principal Amount</span>
            <span className="font-mono">USD {PRINCIPAL_USD.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/15 pb-3">
            <span className="text-sm text-white/70">Applied FX Rate</span>
            <span className="font-mono">1 USD = NGN {FX_RATE.toLocaleString('en-NG')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Final NGN Deduction</span>
            <span className="font-mono text-xl font-bold">NGN {finalNgnAmount.toLocaleString('en-NG', { maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <p className="mt-4 text-xs text-white/60">
          Simulated API target: {process.env.NEXT_PUBLIC_API_URL ?? 'NEXT_PUBLIC_API_URL not set'}
        </p>

        <button
          type="button"
          onClick={handlePay}
          disabled={isPaying}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-amber py-4 text-base font-semibold text-white transition hover:bg-brand-gold disabled:cursor-not-allowed disabled:opacity-80"
        >
          {isPaying ? (
            <>
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Securing Payment...
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5" />
              Pay Securely
            </>
          )}
        </button>

        {isPaymentComplete && (
          <p className="mt-4 text-center text-sm font-medium text-green-300">Payment authorized successfully.</p>
        )}
      </div>
    </div>
  );
}
