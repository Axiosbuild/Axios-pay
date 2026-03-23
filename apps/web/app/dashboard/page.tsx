'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { connectRatesSocket, disconnectRatesSocket } from '@/lib/socket-client';
import { useAuthStore } from '@/store/auth';
import { useWalletStore } from '@/store/wallets';
import { useFXStore } from '@/store/fx';

export default function DashboardPage() {
  const { user, accessToken } = useAuthStore();
  const { wallets, setWallets } = useWalletStore();
  const { rates, connected } = useFXStore();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (accessToken) connectRatesSocket(accessToken);
    return () => disconnectRatesSocket();
  }, [accessToken]);

  useEffect(() => {
    apiClient.get('/wallets').then((r) => setWallets(r.data || [])).catch(() => setWallets([]));
    apiClient.get('/transactions?limit=6').then((r) => setTransactions(r.data.transactions || [])).catch(() => setTransactions([]));
  }, [setWallets]);

  const totalBalance = useMemo(() => wallets.reduce((acc, w) => acc + Number(w.balance || 0), 0), [wallets]);

  return (
    <main className="min-h-screen bg-green-900 text-white p-6">
      <header className="max-w-6xl mx-auto flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="font-display text-4xl text-gold-400">Dashboard</h1>
          <p className="text-white/70">Welcome back, {user?.firstName || 'Member'}</p>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link href="/dashboard/exchange" className="px-4 py-2 glass rounded">Exchange</Link>
          <Link href="/dashboard/history" className="px-4 py-2 glass rounded">History</Link>
          <Link href="/dashboard/kyc" className="px-4 py-2 glass rounded">KYC</Link>
          <Link href="/dashboard/settings" className="px-4 py-2 glass rounded">Settings</Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto mt-6 grid lg:grid-cols-3 gap-5">
        <article className="glass rounded-2xl p-6">
          <p className="text-white/70">Total wallet balance</p>
          <h2 className="amount text-4xl mt-2">{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          <p className="text-sm mt-2">Live rates: <span className={connected ? 'text-green-400' : 'text-yellow-400'}>{connected ? 'Connected' : 'Disconnected'}</span></p>
        </article>

        <article className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-display text-2xl text-gold-400">Wallet grid</h3>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {wallets.map((w) => (
              <div key={w.id} className="bg-black/20 rounded p-3">
                <p className="text-sm text-white/60">{w.currency}</p>
                <p className="amount text-lg">{Number(w.balance).toLocaleString()}</p>
              </div>
            ))}
            {!wallets.length && <p className="text-white/60">No wallets available.</p>}
          </div>
        </article>
      </section>

      <section className="max-w-6xl mx-auto mt-5 grid lg:grid-cols-2 gap-5">
        <article className="glass rounded-2xl p-6">
          <h3 className="font-display text-2xl text-gold-400">Live rates</h3>
          <div className="mt-4 space-y-2">
            {Object.values(rates).slice(0, 8).map((r: any) => (
              <div key={`${r.baseCurrency}:${r.quoteCurrency}`} className="bg-black/20 rounded p-3 flex justify-between">
                <span>{r.baseCurrency} → {r.quoteCurrency}</span>
                <span className="amount">{Number(r.mid).toFixed(4)}</span>
              </div>
            ))}
            {!Object.keys(rates).length && <p className="text-white/60">Awaiting socket updates...</p>}
          </div>
        </article>

        <article className="glass rounded-2xl p-6">
          <h3 className="font-display text-2xl text-gold-400">Recent transactions</h3>
          <div className="mt-4 space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="bg-black/20 rounded p-3 flex justify-between">
                <span>{t.type} · {t.status}</span>
                <span className="amount">{t.fromCurrency} {Number(t.fromAmount).toLocaleString()}</span>
              </div>
            ))}
            {!transactions.length && <p className="text-white/60">No recent transactions.</p>}
          </div>
        </article>
      </section>
    </main>
  );
}
