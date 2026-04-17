'use client';

import { useEffect, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

const RESOLVED_NAME = 'Okechukwu Donald Nnebedum';

export function TransferView() {
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedName, setResolvedName] = useState('');

  const debouncedAccountNumber = useDebounce(accountNumber, 500);

  useEffect(() => {
    if (debouncedAccountNumber.trim().length < 10) {
      setResolvedName('');
      setIsResolving(false);
      return;
    }

    setIsResolving(true);
    const timerId = window.setTimeout(() => {
      setResolvedName(RESOLVED_NAME);
      setIsResolving(false);
    }, 650);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [debouncedAccountNumber]);

  return (
    <div className="h-full p-5 pb-28">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Bank Transfer</p>
        <h1 className="mt-2 font-display text-3xl text-text-primary">Send Money</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Enter a bank account number. We will resolve and display the beneficiary name before transfer.
        </p>

        <label htmlFor="accountNumber" className="mt-7 block text-sm font-medium text-text-secondary">
          Bank Account Number
        </label>
        <input
          id="accountNumber"
          type="text"
          inputMode="numeric"
          value={accountNumber}
          onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="Enter 10-digit account number"
          className="mt-2 w-full rounded-2xl border border-border bg-page px-4 py-4 text-lg text-text-primary outline-none placeholder:text-text-muted focus:border-brand-amber"
        />

        {isResolving && <p className="mt-3 text-sm text-text-secondary">Resolving account name...</p>}
        {resolvedName && <p className="mt-3 text-base font-bold text-success">{resolvedName}</p>}

        {resolvedName && (
          <>
            <label htmlFor="transferAmount" className="mt-7 block text-sm font-medium text-text-secondary">
              Amount
            </label>
            <input
              id="transferAmount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="mt-2 w-full rounded-2xl border border-border bg-page px-4 py-4 text-lg text-text-primary outline-none placeholder:text-text-muted focus:border-brand-amber"
            />

            <button
              type="button"
              disabled={!amount.trim()}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-base font-semibold text-white transition hover:bg-navy-medium disabled:cursor-not-allowed disabled:bg-navy/40"
            >
              <SendHorizontal className="h-5 w-5" />
              Send
            </button>
          </>
        )}
      </div>
    </div>
  );
}
