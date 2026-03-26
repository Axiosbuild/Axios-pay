'use client';
import { useMemo, useRef } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { SUPPORTED_CORRIDORS, getCurrencyDisplay } from '@/lib/currencies';
import { useRates } from '@/hooks/useRates';

function formatUpdatedAgo(lastUpdated: string | null): string {
  if (!lastUpdated) return 'Never updated';
  const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000));
  if (diffSeconds < 60) return `Updated ${diffSeconds}s ago`;
  const minutes = Math.floor(diffSeconds / 60);
  return `Updated ${minutes} min ago`;
}

export function RatesTicker() {
  const { rates, lastUpdated } = useRates();
  const previousRates = useRef<Record<string, number>>({});

  const pairs = useMemo(
    () =>
      SUPPORTED_CORRIDORS.map(({ from, to }) => {
        const liveRate = rates.find((rate) => rate.fromCurrency === from && rate.toCurrency === to);
        const key = `${from}-${to}`;
        const current = liveRate ? Number(liveRate.rate) : null;
        const previous = previousRates.current[key];
        if (current !== null && Number.isFinite(current)) {
          previousRates.current[key] = current;
        }
        const direction = current !== null && Number.isFinite(previous) ? (current > previous ? 'up' : current < previous ? 'down' : 'same') : 'same';

        return {
          from,
          to,
          rate: liveRate?.rate || '-',
          provider: liveRate?.provider || 'n/a',
          direction,
        };
      }),
    [rates]
  );

  const doubled = [...pairs, ...pairs];

  return (
    <div>
      <div className="px-4 pb-2 text-xs text-text-muted">{formatUpdatedAgo(lastUpdated)}</div>
      <div className="overflow-hidden whitespace-nowrap">
      <div className="inline-flex gap-8 animate-ticker">
        {doubled.map((pair, i) => (
          <span key={i} className="text-sm font-mono text-text-secondary inline-flex items-center gap-2">
            <span className="text-brand-amber font-semibold">{getCurrencyDisplay(pair.from)} / {getCurrencyDisplay(pair.to)}</span>
            {' '}{pair.rate}
            {pair.direction === 'up' && <ArrowUp className="w-3.5 h-3.5 text-green-500" />}
            {pair.direction === 'down' && <ArrowDown className="w-3.5 h-3.5 text-red-500" />}
            <span className="text-[10px] uppercase border border-border rounded px-1.5 py-0.5">{pair.provider}</span>
          </span>
        ))}
      </div>
      </div>
    </div>
  );
}
