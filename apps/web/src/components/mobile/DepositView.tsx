'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreditCard, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const INTERSWITCH_INLINE_SCRIPT_URL = 'https://sandbox.interswitchng.com/collections/w/pay';
const DEFAULT_PAY_ITEM_ID = 'Default_Payable_MX';

type InterswitchCheckoutResponse = {
  txn_ref?: string;
  transactionRef?: string;
  response_code?: string;
  status?: string;
};

type InterswitchCheckoutConfig = {
  merchant_code: string;
  pay_item_id: string;
  site_redirect_url: string;
  amount: number;
  currency: 'NGN' | number;
  txn_ref: string;
  customer_email: string;
  callback: (response: InterswitchCheckoutResponse) => void;
  onClose: () => void;
};

type VerifyDepositResponse = {
  success?: boolean;
  status?: string;
  message?: string;
  walletBalance?: number;
  balance?: number;
};

export function DepositView() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [amount, setAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const ngnWallet = user?.wallets?.find((wallet) => wallet.currency === 'NGN');
    return ngnWallet ? Number(ngnWallet.balance) : 0;
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isScriptLoading, setIsScriptLoading] = useState(true);
  const [isLaunchingCheckout, setIsLaunchingCheckout] = useState(false);
  const [isVerifyingDeposit, setIsVerifyingDeposit] = useState(false);

  useEffect(() => {
    const ngnWallet = user?.wallets?.find((wallet) => wallet.currency === 'NGN');
    if (ngnWallet) {
      setWalletBalance(Number(ngnWallet.balance));
    }
  }, [user?.wallets]);

  useEffect(() => {
    const existingScript = document.getElementById('interswitch-inline-sdk') as HTMLScriptElement | null;
    if (existingScript) {
      setIsScriptLoading(false);
      const checkout = (window as Window & { webpayCheckout?: (config: InterswitchCheckoutConfig) => void }).webpayCheckout;
      setIsScriptReady(typeof checkout === 'function');
      return;
    }

    const script = document.createElement('script');
    script.id = 'interswitch-inline-sdk';
    script.src = INTERSWITCH_INLINE_SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      const checkout = (window as Window & { webpayCheckout?: (config: InterswitchCheckoutConfig) => void }).webpayCheckout;
      setIsScriptLoading(false);
      setIsScriptReady(typeof checkout === 'function');
      if (typeof checkout !== 'function') {
        setStatusMessage('Payment gateway loaded incorrectly. Please refresh and try again.');
      }
    };

    script.onerror = () => {
      setIsScriptLoading(false);
      setIsScriptReady(false);
      setStatusMessage('Unable to load payment gateway. Check your network and retry.');
    };

    document.body.appendChild(script);
  }, []);

  const parsedAmount = useMemo(() => {
    const numericAmount = Number.parseFloat(amount.replace(/,/g, ''));
    return Number.isFinite(numericAmount) ? numericAmount : 0;
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

  async function verifyDeposit(txnRef: string, amountNgn: number) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      setStatusMessage('Missing NEXT_PUBLIC_BACKEND_URL. Set it in .env.local.');
      return;
    }

    setIsVerifyingDeposit(true);
    setStatusMessage('Verifying deposit...');

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
        throw new Error(payload.message || 'Verification failed');
      }

      const isSuccessful = payload.success === true || payload.status === 'SUCCESS';
      if (!isSuccessful) {
        throw new Error(payload.message || 'Deposit verification was not successful');
      }

      const updatedBalance =
        typeof payload.walletBalance === 'number'
          ? payload.walletBalance
          : typeof payload.balance === 'number'
            ? payload.balance
            : walletBalance + amountNgn;

      setWalletBalance(updatedBalance);
      setStatusMessage('Deposit successful. Wallet has been updated.');
      setAmount('');

      if (user?.wallets) {
        updateUser({
          wallets: user.wallets.map((wallet) =>
            wallet.currency === 'NGN'
              ? { ...wallet, balance: updatedBalance.toString() }
              : wallet
          ),
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Deposit verification failed.';
      setStatusMessage(message);
    } finally {
      setIsVerifyingDeposit(false);
    }
  }

  function handleFundWallet() {
    const merchantCode = process.env.NEXT_PUBLIC_INTERSWITCH_MERCHANT_CODE;
    if (!merchantCode) {
      setStatusMessage('Missing NEXT_PUBLIC_INTERSWITCH_MERCHANT_CODE. Set it in .env.local.');
      return;
    }

    if (parsedAmount <= 0) {
      setStatusMessage('Enter a valid amount to continue.');
      return;
    }

    if (!user?.email) {
      setStatusMessage('No customer email found. Please sign in again.');
      return;
    }

    const checkout = (window as Window & { webpayCheckout?: (config: InterswitchCheckoutConfig) => void }).webpayCheckout;

    if (!isScriptReady || typeof checkout !== 'function') {
      setStatusMessage('Payment gateway is still loading. Please try again in a moment.');
      return;
    }

    const transactionReference = `AXIOSPAY-${Date.now()}`;
    const amountInKobo = Math.round(parsedAmount * 100);

    setStatusMessage('Launching secure card checkout...');
    setIsLaunchingCheckout(true);

    checkout({
      merchant_code: merchantCode,
      pay_item_id: DEFAULT_PAY_ITEM_ID,
      site_redirect_url: window.location.href,
      amount: amountInKobo,
      currency: 566,
      txn_ref: transactionReference,
      customer_email: user.email,
      callback: (response) => {
        const txnRefFromGateway = response.txn_ref || response.transactionRef || transactionReference;
        setIsLaunchingCheckout(false);
        void verifyDeposit(txnRefFromGateway, parsedAmount);
      },
      onClose: () => {
        setIsLaunchingCheckout(false);
      },
    });
  }

  const isBusy = isScriptLoading || isLaunchingCheckout || isVerifyingDeposit;

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

        <div className="mt-4 rounded-2xl bg-subtle p-3 text-sm text-text-secondary">
          <p className="font-medium text-text-primary">Wallet Balance</p>
          <p className="font-mono">NGN {walletBalance.toLocaleString('en-NG', { maximumFractionDigits: 2 })}</p>
        </div>

        <button
          type="button"
          onClick={handleFundWallet}
          disabled={!amount.trim() || parsedAmount <= 0 || isBusy}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-base font-semibold text-white transition hover:bg-navy-medium disabled:cursor-not-allowed disabled:bg-navy/40"
        >
          {isBusy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
          {isVerifyingDeposit ? 'Verifying deposit...' : 'Fund Wallet'}
        </button>

        <div className="mt-4 rounded-2xl border border-border bg-page p-3 text-xs text-text-secondary">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-success" />
            <p>
              Card checkout opens in an Interswitch secure inline modal on this page. You will not be redirected away.
            </p>
          </div>
        </div>

        {statusMessage && (
          <p className="mt-4 text-sm font-medium text-text-primary">{statusMessage}</p>
        )}
      </div>

      {isVerifyingDeposit && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-navy/30 px-6 backdrop-blur-md">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-xl">
            <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-brand-amber" />
            <p className="mt-3 text-sm font-medium text-text-primary">Verifying deposit...</p>
          </div>
        </div>
      )}
    </div>
  );
}
