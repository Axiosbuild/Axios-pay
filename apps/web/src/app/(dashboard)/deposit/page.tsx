'use client';

import { useEffect, useMemo, useState } from 'react';
import Script from 'next/script';
import { BadgeDollarSign, CreditCard, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const INTERSWITCH_INLINE_SCRIPT_URL =
  process.env.NEXT_PUBLIC_INTERSWITCH_INLINE_SCRIPT_URL || 'https://sandbox.interswitchng.com/collections/w/pay';
const PAY_ITEM_ID = process.env.NEXT_PUBLIC_INTERSWITCH_PAY_ITEM_ID || 'Default_Payable_MX';

type PaymentGatewayResponse = {
  resp?: string;
  status?: string;
  message?: string;
  txn_ref?: string;
  transactionRef?: string;
};

type CheckoutConfig = {
  merchant_code: string;
  pay_item_id: string;
  site_redirect_url: string;
  amount: number;
  currency: number;
  txn_ref: string;
  customer_email: string;
  callback?: (response: PaymentGatewayResponse) => void;
  onComplete?: (response: PaymentGatewayResponse) => void;
  onClose?: () => void;
};

type VerifyDepositResponse = {
  success?: boolean;
  status?: string;
  message?: string;
  walletBalance?: number;
  balance?: number;
};

function buildTxnRef() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AXIOSPAY-${Date.now()}-${suffix}`;
}

export default function DepositPage() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [amount, setAmount] = useState('1000');
  const [email, setEmail] = useState(user?.email ?? '');
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const wallet = user?.wallets?.find((entry) => entry.currency === 'NGN');
    return wallet ? Number(wallet.balance) : 0;
  });
  const [message, setMessage] = useState('');
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingTxnRef, setPendingTxnRef] = useState('');

  useEffect(() => {
    const wallet = user?.wallets?.find((entry) => entry.currency === 'NGN');
    if (wallet) {
      setWalletBalance(Number(wallet.balance));
    }
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.wallets, user?.email]);

  const parsedAmount = useMemo(() => {
    const value = Number.parseFloat(amount.replace(/,/g, ''));
    return Number.isFinite(value) ? value : 0;
  }, [amount]);

  const formattedAmount = useMemo(() => {
    if (parsedAmount <= 0) {
      return '0.00';
    }
    return parsedAmount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [parsedAmount]);

  async function verifyDeposit(txnRef: string) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      setMessage('Missing NEXT_PUBLIC_BACKEND_URL. Add it to .env.local.');
      return;
    }

    setIsVerifying(true);
    setMessage('Verifying deposit...');

    try {
      const response = await fetch(`${backendUrl}/api/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ txn_ref: txnRef }),
      });

      const payload = (await response.json()) as VerifyDepositResponse;

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to verify deposit.');
      }

      const isSuccessful = payload.success === true || payload.status === 'SUCCESS' || payload.status === 'PAID';
      if (!isSuccessful) {
        throw new Error(payload.message || 'Deposit was not confirmed.');
      }

      const nextBalance =
        typeof payload.walletBalance === 'number'
          ? payload.walletBalance
          : typeof payload.balance === 'number'
            ? payload.balance
            : walletBalance + parsedAmount;

      setWalletBalance(nextBalance);
      setMessage('Deposit successful. Wallet balance updated.');

      if (user?.wallets) {
        updateUser({
          wallets: user.wallets.map((wallet) =>
            wallet.currency === 'NGN' ? { ...wallet, balance: nextBalance.toString() } : wallet
          ),
        });
      }
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Deposit verification failed.');
    } finally {
      setIsVerifying(false);
      setIsLaunching(false);
    }
  }

  function handleFundWallet() {
    const merchantCode = process.env.NEXT_PUBLIC_INTERSWITCH_MERCHANT_CODE;
    const checkout = (window as Window & { webpayCheckout?: (config: CheckoutConfig) => void }).webpayCheckout;

    if (!merchantCode) {
      setMessage('Missing NEXT_PUBLIC_INTERSWITCH_MERCHANT_CODE. Add it to .env.local.');
      return;
    }

    if (parsedAmount < 100) {
      setMessage('Enter at least NGN 100 to continue.');
      return;
    }

    if (!email.trim()) {
      setMessage('Enter a valid email address for the payment receipt.');
      return;
    }

    if (!isScriptReady || typeof checkout !== 'function') {
      setMessage('Payment gateway is still loading. Please try again in a moment.');
      return;
    }

    const txnRef = buildTxnRef();
    const amountInKobo = Math.round(parsedAmount * 100);
    setPendingTxnRef(txnRef);
    setIsLaunching(true);
    setMessage('Opening secure card checkout...');

    const completeFlow = (response: PaymentGatewayResponse) => {
      const responseTxnRef = response.txn_ref || response.transactionRef || txnRef;
      setPendingTxnRef(responseTxnRef);
      setMessage('Card payment completed. Verifying deposit...');
      void verifyDeposit(responseTxnRef);
    };

    checkout({
      merchant_code: merchantCode,
      pay_item_id: PAY_ITEM_ID,
      site_redirect_url: window.location.href,
      amount: amountInKobo,
      currency: 566,
      txn_ref: txnRef,
      customer_email: email.trim(),
      callback: completeFlow,
      onComplete: completeFlow,
      onClose: () => {
        setIsLaunching(false);
        if (!pendingTxnRef) {
          setMessage('Payment window closed.');
        }
      },
    });
  }

  const isBusy = isLaunching || isVerifying;

  return (
    <main className="relative mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 rounded-card bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_38%)]" />
      <Script
        id="interswitch-inline-sdk"
        src={INTERSWITCH_INLINE_SCRIPT_URL}
        strategy="afterInteractive"
        onLoad={() => {
          const checkout = (window as Window & { webpayCheckout?: unknown }).webpayCheckout;
          setIsScriptReady(typeof checkout === 'function');
          if (typeof checkout !== 'function') {
            setMessage('Payment gateway loaded, but the inline checkout function is unavailable.');
          }
        }}
        onError={() => {
          setIsScriptReady(false);
          setMessage('Unable to load the payment gateway script. Check your connection and try again.');
        }}
      />

      <section className="overflow-hidden rounded-card border border-border bg-surface p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-bg px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-amber">
          <BadgeDollarSign className="h-3.5 w-3.5" />
          Fund Wallet
        </div>

        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">Fund Wallet with Card</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
          Enter the amount you want to fund, then pay securely with your card in the Interswitch inline modal.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-card border border-border bg-page p-4">
              <label htmlFor="amount" className="mb-2 block text-sm font-medium text-text-secondary">
                Amount (NGN)
              </label>
              <input
                id="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="1000"
                className="w-full rounded-2xl border border-border bg-white px-4 py-4 font-mono text-2xl text-text-primary outline-none placeholder:text-text-muted focus:border-brand-amber"
              />
              <p className="mt-2 text-xs text-text-muted">NGN {formattedAmount}</p>
            </div>

            <div className="rounded-card border border-border bg-page p-4">
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-text-secondary">
                Email for receipt
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-text-primary outline-none placeholder:text-text-muted focus:border-brand-amber"
              />
            </div>

            <button
              type="button"
              onClick={handleFundWallet}
              disabled={!isScriptReady || isBusy || parsedAmount < 100}
              className="inline-flex w-full items-center justify-center gap-2 rounded-btn bg-navy px-6 py-4 text-base font-semibold text-white transition hover:bg-navy-medium disabled:cursor-not-allowed disabled:bg-navy/40"
            >
              {isBusy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
              {isVerifying ? 'Verifying deposit...' : 'Pay with Card'}
            </button>
          </div>

          <aside className="space-y-4">
            <div className="rounded-card border border-border bg-surface p-4 text-sm text-text-secondary">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Wallet balance</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-text-primary">
                NGN {walletBalance.toLocaleString('en-NG', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-card border border-border bg-brand-bg p-4 text-xs text-text-secondary">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-success" />
                <p>
                  This opens a secure Interswitch inline card modal on the same page. No redirect is required for the payment step.
                </p>
              </div>
            </div>
            {pendingTxnRef && (
              <div className="rounded-card border border-border bg-page p-4 text-xs text-text-muted">
                <p className="font-medium text-text-secondary">Last transaction reference</p>
                <p className="mt-1 break-all font-mono text-text-primary" aria-label="Last transaction reference value">
                  {pendingTxnRef}
                </p>
              </div>
            )}
          </aside>
        </div>

        {message && <p className="mt-4 text-sm font-medium text-text-primary">{message}</p>}
      </section>
    </main>
  );
}
