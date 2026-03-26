'use client';
import { DEFAULT_CORRIDOR_RATES, SUPPORTED_CORRIDORS, getCurrencyDisplay } from '@/lib/currencies';

const PAIRS = SUPPORTED_CORRIDORS.map(({ from, to }) => ({
  from,
  to,
  rate: DEFAULT_CORRIDOR_RATES[`${from}-${to}`] || '-',
}));

export function RatesTicker() {
  const doubled = [...PAIRS, ...PAIRS];
  return (
    <div className="overflow-hidden whitespace-nowrap">
      <div className="inline-flex gap-8 animate-ticker">
        {doubled.map((pair, i) => (
          <span key={i} className="text-sm font-mono text-text-secondary">
            <span className="text-brand-amber font-semibold">{getCurrencyDisplay(pair.from)} / {getCurrencyDisplay(pair.to)}</span>
            {' '}{pair.rate}
          </span>
        ))}
      </div>
    </div>
  );
}
