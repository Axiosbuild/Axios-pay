'use client';

import { useMemo, useState } from 'react';
import { CircleDot, ChevronRight } from 'lucide-react';
import { CORRIDOR_ROWS, CORRIDOR_TABS } from './landing-data';
import { CURRENCY_META, type CurrencyCode } from '@/lib/currencies';

export function CorridorTable() {
  const [activeTab, setActiveTab] = useState<CurrencyCode>('NGN');

  const rows = useMemo(
    () => CORRIDOR_ROWS.filter((row) => row.from === activeTab),
    [activeTab]
  );

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">Supported Corridors</h3>
          <p className="mt-1 text-sm text-slate-500">Filter live corridor rates by base currency.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {CORRIDOR_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-slate-950 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{CURRENCY_META[tab].flag}</span>
              <span>{tab}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:p-6">
        {rows.map((row) => (
          <div
            key={`${row.from}-${row.to}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {CURRENCY_META[row.from].flag} {row.from}
                </p>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                  {CURRENCY_META[row.to].flag} {row.to}
                </p>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
                <CircleDot className="h-3 w-3 animate-pulse" />
                Live
              </span>
            </div>

            <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{row.rate}</p>
            <p className="mt-1 text-sm text-slate-500">1 {row.from} against {row.to}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
