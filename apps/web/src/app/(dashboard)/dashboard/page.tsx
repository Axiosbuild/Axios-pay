'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowUpRight, CreditCard, ShieldCheck, TrendingUp, Wallet2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { WalletCard } from '@/components/ui/WalletCard';
import { TransactionRow } from '@/components/ui/TransactionRow';
import { Spinner } from '@/components/ui/Spinner';
import { RatesGrid } from '@/components/ui/RatesGrid';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

interface Wallet {
  id: string;
  currency: string;
  balance: string;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string | number;
  toAmount: string | number;
  narration?: string;
  createdAt: string;
}

const DEFAULT_CURRENCY_BY_NATIONALITY: Record<string, string> = {
  NG: 'NGN',
  UG: 'UGX',
  KE: 'KES',
  GH: 'GHS',
  ZA: 'ZAR',
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => api.wallets.getAll().then(r => r.data),
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', 1],
    queryFn: () => api.wallets.getTransactions({ page: 1, limit: 5 }).then(r => r.data),
  });

  const fallbackCurrency = DEFAULT_CURRENCY_BY_NATIONALITY[(user?.nationality || 'NG').toUpperCase()] || 'NGN';

  const displayWallets = useMemo<Wallet[]>(() => {
    if (!wallets?.length) return [];
    const sorted = [...wallets];
    sorted.sort((a: Wallet, b: Wallet) => {
      if (a.currency === fallbackCurrency) return -1;
      if (b.currency === fallbackCurrency) return 1;
      return 0;
    });
    return sorted;
  }, [wallets, fallbackCurrency]);

  const primaryWallet = displayWallets[0];
  const primaryWalletBalance = Number(primaryWallet?.balance || 0);
  const primaryWalletBalanceFormatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: primaryWallet?.currency || fallbackCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(primaryWalletBalance);

  return (
    <div className="relative max-w-6xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 rounded-card bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_38%)]" />

      <div className="mb-8 overflow-hidden rounded-card border border-border bg-surface p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-success">Dashboard</p>
        <h1 className="mt-3 font-display text-[clamp(1.6rem,4vw,2.6rem)] font-bold text-text-primary">
          {getGreeting()}, {user?.firstName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Monitor balances, track transactions, and move funds quickly across currencies.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/deposit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-btn bg-brand-amber px-4 py-2.5 text-base font-medium text-white transition-all duration-200 hover:bg-brand-gold sm:w-auto"
          >
            <CreditCard className="h-4 w-4" />
            Fund Wallet
          </Link>
          <Link
            href="/swap"
            className="inline-flex w-full items-center justify-center gap-2 rounded-btn bg-navy px-4 py-2.5 text-base font-medium text-white transition-all duration-200 hover:bg-navy-medium sm:w-auto"
          >
            Swap Now
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-card border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-text-muted">Primary Balance</p>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-xl font-semibold text-text-primary">{primaryWalletBalanceFormatted}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-text-muted">Total Wallets</p>
            <Wallet2 className="h-4 w-4 text-brand-amber" />
          </div>
          <p className="mt-2 text-xl font-semibold text-text-primary">{displayWallets.length || 0}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Recent Txn</p>
          <p className="mt-2 text-xl font-semibold text-text-primary">{txData?.transactions?.length || 0}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-text-muted">Status</p>
            <ShieldCheck className="h-4 w-4 text-success" />
          </div>
          <p className="mt-2 text-xl font-semibold text-text-primary">Active</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4 sm:col-span-2 lg:col-span-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Primary Wallet</p>
          <p className="mt-2 text-xl font-semibold text-text-primary">{displayWallets?.[0]?.currency || '—'}</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Your Wallets</h2>
          <Link href="/wallet" className="text-sm text-brand-amber hover:underline">
            Manage wallets
          </Link>
        </div>
        {walletsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-card bg-subtle" />
            ))}
          </div>
        ) : displayWallets.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayWallets.map((w: Wallet) => (
              <WalletCard key={w.id} currency={w.currency} balance={w.balance} primary={w.currency === 'NGN'} />
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm">No wallets yet. Fund your account to get started.</p>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Recent Transactions</h2>
          <Link href="/wallet" className="text-sm text-brand-amber hover:underline">View all</Link>
        </div>
        <div className="bg-surface rounded-card border border-border p-4">
          {txLoading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : txData?.transactions?.length ? (
            <div className="space-y-3">
              {txData.transactions.map((tx: Transaction) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm text-center py-4">No transactions yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">Rate Snapshot</h2>
          <p className="text-sm text-text-secondary">Track corridor performance in real-time and optimize your swaps.</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">Wallet Mix</h2>
          <p className="text-sm text-text-secondary">Maintain diversified balances for smoother cross-border payments.</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">Live Corridor Rates</h2>
        <RatesGrid />
      </div>

      <div className="mt-6 rounded-card border border-border bg-brand-bg p-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">Cross-border payments, unlocked</h2>
        <p className="text-sm text-text-secondary">
          Axios Pay partners with local banks across our supported countries and payment rails like Interswitch/Quickteller
          to make local-currency spending seamless. Example: if you travel from Nigeria to Nairobi for a conference, you can
          swap NGN to KES and pay directly in Kenya without routing through USD.
        </p>
      </div>
    </div>
  );
}
