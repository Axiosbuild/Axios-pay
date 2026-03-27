'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { WalletCard } from '@/components/ui/WalletCard';
import { TransactionRow } from '@/components/ui/TransactionRow';
import { Spinner } from '@/components/ui/Spinner';

const TABS = ['ALL', 'DEPOSITS', 'SWAPS'] as const;
type Tab = typeof TABS[number];

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

export default function WalletPage() {
  const [tab, setTab] = useState<Tab>('ALL');
  const [page, setPage] = useState(1);

  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => api.wallets.getAll().then(r => r.data),
  });

  const typeMap: Record<Tab, string | undefined> = { ALL: undefined, DEPOSITS: 'DEPOSIT', SWAPS: 'SWAP' };

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', tab, page],
    queryFn: () => api.wallets.getTransactions({ page, limit: 20, type: typeMap[tab] }).then(r => r.data),
  });

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Wallet</h1>

      <div className="mb-6 bg-brand-bg border border-brand-amber/20 rounded-card p-4">
        <p className="text-sm text-text-secondary">Total Balance (across wallets)</p>
        <p className="text-2xl font-semibold text-text-primary mt-1">
          {(wallets || []).length ? `${(wallets || []).length} wallets active` : 'No wallet funded yet'}
        </p>
      </div>

      {/* Balances */}
      <div className="mb-8">
        {walletsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-subtle rounded-card animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(wallets || []).map((w: Wallet) => (
              <WalletCard key={w.id} currency={w.currency} balance={w.balance} />
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      <div>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 min-h-11 ${tab === t ? 'bg-brand-amber text-white' : 'bg-subtle text-text-secondary hover:bg-border'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="bg-surface rounded-card border border-border p-4">
          {txLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : txData?.transactions?.length ? (
            <>
              {txData.transactions.map((tx: Transaction) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
              <div className="flex justify-center gap-3 mt-4">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-sm text-brand-amber disabled:text-text-muted">Previous</button>
                <span className="text-sm text-text-muted">Page {page} of {txData.pagination?.pages || 1}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= (txData.pagination?.pages || 1)} className="text-sm text-brand-amber disabled:text-text-muted">Next</button>
              </div>
            </>
          ) : (
            <p className="text-text-muted text-sm text-center py-8">No transactions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
