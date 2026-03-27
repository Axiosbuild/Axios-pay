'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { WalletCard } from '@/components/ui/WalletCard';
import { TransactionRow } from '@/components/ui/TransactionRow';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

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
  reference?: string;
}

interface Paycode {
  id: string;
  code: string;
  amount: string;
  expiresAt: string;
  isUsed: boolean;
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

  const [cashOutAmount, setCashOutAmount] = useState('1000');
  const [cashOutLoading, setCashOutLoading] = useState(false);
  const [cashOutMessage, setCashOutMessage] = useState('');
  const [refundReasonByTx, setRefundReasonByTx] = useState<Record<string, string>>({});
  const [refundLoadingTxId, setRefundLoadingTxId] = useState<string | null>(null);

  const { data: paycodes } = useQuery({
    queryKey: ['paycodes'],
    queryFn: () => api.wallets.listPaycodes().then((r) => r.data as Paycode[]),
  });

  async function generatePaycode() {
    setCashOutLoading(true);
    setCashOutMessage('');
    try {
      const result = await api.wallets.generatePaycode({ amount: Number(cashOutAmount) });
      const code = result.data?.code as string | undefined;
      setCashOutMessage(code ? `Generated paycode: ${code}` : 'Paycode generated successfully.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setCashOutMessage(e?.response?.data?.message || e?.message || 'Failed to generate paycode.');
    } finally {
      setCashOutLoading(false);
    }
  }

  async function requestRefund(transactionId: string) {
    const reason = refundReasonByTx[transactionId] || 'User requested refund';
    setRefundLoadingTxId(transactionId);
    try {
      await api.wallets.requestRefund({ transactionId, reason });
    } catch {
      // ignore in list row for now
    } finally {
      setRefundLoadingTxId(null);
    }
  }

  const now = Date.now();

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
                <div key={tx.id} className="space-y-2">
                  <TransactionRow
                    tx={{
                      ...tx,
                      canRefund:
                        tx.type === 'DEPOSIT' &&
                        tx.status === 'COMPLETED' &&
                        now - new Date(tx.createdAt).getTime() <= 24 * 60 * 60 * 1000,
                      onRequestRefund:
                        tx.type === 'DEPOSIT' && tx.status === 'COMPLETED'
                          ? () => requestRefund(tx.id)
                          : undefined,
                    }}
                  />
                  {tx.type === 'DEPOSIT' &&
                    tx.status === 'COMPLETED' &&
                    now - new Date(tx.createdAt).getTime() <= 24 * 60 * 60 * 1000 && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={refundReasonByTx[tx.id] || ''}
                          onChange={(e) =>
                            setRefundReasonByTx((prev) => ({ ...prev, [tx.id]: e.target.value }))
                          }
                          placeholder="Reason for refund"
                          className="w-full px-3 py-2 text-sm rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => requestRefund(tx.id)}
                          loading={refundLoadingTxId === tx.id}
                        >
                          Confirm Refund
                        </Button>
                      </div>
                    )}
                </div>
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

      <div className="mt-8 bg-surface rounded-card border border-border p-4 space-y-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Cash Out</h2>
        <p className="text-sm text-text-secondary">Generate a single-use paycode for Quickteller ATM/POS cash withdrawal.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            min={100}
            value={cashOutAmount}
            onChange={(e) => setCashOutAmount(e.target.value)}
            className="w-full sm:max-w-xs px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
            placeholder="Amount"
          />
          <Button onClick={generatePaycode} loading={cashOutLoading}>Generate Paycode</Button>
        </div>
        {cashOutMessage && (
          <div className="p-3 bg-brand-bg rounded-btn text-sm text-text-primary font-mono">{cashOutMessage}</div>
        )}
        <p className="text-xs text-text-muted">Use this code at any Quickteller ATM or POS terminal.</p>

        <div className="space-y-2">
          {(paycodes || []).map((item) => (
            <div key={item.id} className="border border-border rounded-btn p-3 text-sm">
              <p className="font-mono text-text-primary text-lg">{item.code}</p>
              <p className="text-text-secondary">₦{Number(item.amount).toFixed(2)}</p>
              <p className="text-text-muted text-xs">
                Expires: {new Date(item.expiresAt).toLocaleString()} {item.isUsed ? '• Used' : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
