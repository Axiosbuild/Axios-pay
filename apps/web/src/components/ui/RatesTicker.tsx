'use client';

const PAIRS = [
  { from: 'NGN', to: 'UGX', rate: '10.85' },
  { from: 'NGN', to: 'KES', rate: '0.29' },
  { from: 'NGN', to: 'GHS', rate: '0.021' },
  { from: 'NGN', to: 'ZAR', rate: '0.052' },
  { from: 'UGX', to: 'KES', rate: '0.027' },
  { from: 'KES', to: 'GHS', rate: '0.072' },
  { from: 'KES', to: 'ZAR', rate: '0.178' },
  { from: 'GHS', to: 'ZAR', rate: '2.47' },
];

export function RatesTicker() {
  const doubled = [...PAIRS, ...PAIRS];
  return (
    <div className="overflow-hidden whitespace-nowrap">
      <div className="inline-flex gap-8 animate-ticker">
        {doubled.map((pair, i) => (
          <span key={i} className="text-sm font-mono text-text-secondary">
            <span className="text-brand-amber font-semibold">{pair.from}/{pair.to}</span>
            {' '}{pair.rate}
          </span>
        ))}
      </div>
    </div>
  );
}
