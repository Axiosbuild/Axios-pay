'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/transactions', { params: { page, limit: 12 } }).then((r) => setTransactions(r.data.transactions || [])).catch(() => setTransactions([]));
  }, [page]);

  const grouped = useMemo(() => {
    return transactions.reduce((acc: Record<string, any[]>, item) => {
      const day = new Date(item.createdAt || Date.now()).toISOString().slice(0, 10);
      acc[day] = acc[day] || [];
      acc[day].push(item);
      return acc;
    }, {});
  }, [transactions]);

  return (
    <main className="min-h-screen bg-green-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-4xl text-gold-400">History</h1>

        <div className="mt-6 space-y-5">
          {Object.entries(grouped).map(([day, items]) => (
            <section key={day} className="glass rounded-2xl p-5">
              <h2 className="font-display text-2xl">{day}</h2>
              <div className="mt-3 space-y-2">
                {(items as any[]).map((t) => (
                  <button key={t.id} onClick={() => setSelected(t)} className="w-full text-left bg-black/20 rounded p-3 flex justify-between">
                    <span>{t.type} · {t.status}</span>
                    <span className="amount">{t.fromCurrency} {Number(t.fromAmount).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button className="px-4 py-2 glass rounded" onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
          <button className="px-4 py-2 glass rounded" onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>

      <aside className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#102d21] border-l border-white/10 p-6 transition-transform ${selected ? 'translate-x-0' : 'translate-x-full'}`}>
        <button onClick={() => setSelected(null)} className="mb-4 text-sm text-white/70">Close</button>
        {selected ? <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(selected, null, 2)}</pre> : null}
      </aside>
    </main>
  );
}
