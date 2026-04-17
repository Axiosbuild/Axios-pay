'use client';

import { useMemo, useState } from 'react';
import { CreditCard, ShieldCheck } from 'lucide-react';

export function DepositView() {
  const [amount, setAmount] = useState('');
  const [isInterswitchModalOpen, setIsInterswitchModalOpen] = useState(false);

  const formattedAmount = useMemo(() => {
    const numericAmount = Number.parseFloat(amount.replace(/,/g, ''));
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return '0.00';
    }
    return numericAmount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [amount]);

  return (
    <div className="h-full p-5 pb-28">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Wallet Deposit</p>
        <h1 className="mt-2 font-display text-3xl text-text-primary">Fund With Card</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Enter the amount you want to deposit and continue to the Interswitch secure payment gateway.
        </p>

        <label htmlFor="depositAmount" className="mt-7 block text-sm font-medium text-text-secondary">
          Amount
        </label>
        <div className="mt-2 rounded-2xl border border-border bg-page px-4 py-4">
          <input
            id="depositAmount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full bg-transparent font-mono text-3xl text-text-primary outline-none placeholder:text-text-muted"
          />
          <p className="mt-2 text-xs text-text-muted">NGN {formattedAmount}</p>
        </div>

        <button
          type="button"
          onClick={() => setIsInterswitchModalOpen(true)}
          disabled={!amount.trim()}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-base font-semibold text-white transition hover:bg-navy-medium disabled:cursor-not-allowed disabled:bg-navy/40"
        >
          <CreditCard className="h-5 w-5" />
          Fund Wallet
        </button>
      </div>

      {isInterswitchModalOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-navy/40 px-6 backdrop-blur-2xl">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <ShieldCheck className="mx-auto h-10 w-10 text-success" />
            <h2 className="mt-4 font-display text-2xl text-text-primary">Secure Gateway</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Simulating Interswitch Webpay Inline. You are about to authorize NGN {formattedAmount}.
            </p>
            <button
              type="button"
              onClick={() => setIsInterswitchModalOpen(false)}
              className="mt-6 w-full rounded-2xl bg-brand-amber py-3.5 font-semibold text-white hover:bg-brand-gold"
            >
              Close Gateway
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
