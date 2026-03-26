'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { WalletCard } from '@/components/ui/WalletCard';
import { TransactionRow } from '@/components/ui/TransactionRow';
import { Button } from '@/components/ui/Button';
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

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          {getGreeting()}, {user?.firstName}! 👋
        </h1>
        <p className="text-text-muted mt-1">Here&apos;s your financial overview.</p>
      </div>

      {/* Wallet cards */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">Your Wallets</h2>
        {walletsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-subtle rounded-card animate-pulse" />)}
          </div>
        ) : wallets?.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map((w: Wallet) => (
              <WalletCard key={w.id} currency={w.currency} balance={w.balance} primary={w.currency === 'NGN'} />
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm">No wallets yet. Fund your account to get started.</p>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
        <Link href="/deposit">
          <Button>Fund Wallet</Button>
        </Link>
        <Link href="/swap">
          <Button variant="secondary">Swap Now</Button>
        </Link>
      </div>

      {/* Recent transactions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Recent Transactions</h2>
          <Link href="/wallet" className="text-sm text-brand-amber hover:underline">View all</Link>
        </div>
        <div className="bg-surface rounded-card border border-border p-4">
          {txLoading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : txData?.transactions?.length ? (
            txData.transactions.map((tx: Transaction) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))
          ) : (
            <p className="text-text-muted text-sm text-center py-4">No transactions yet.</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">Live Corridor Rates</h2>
        <RatesGrid />
      </div>
    </div>
  );
}
