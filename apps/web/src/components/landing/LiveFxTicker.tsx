import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { LIVE_TICKER_PAIRS } from './landing-data';

export function LiveFxTicker() {
  const tickerItems = [...LIVE_TICKER_PAIRS, ...LIVE_TICKER_PAIRS];

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/70 py-4 shadow-sm backdrop-blur">
      <div className="flex min-w-max animate-marquee items-center gap-3 px-4">
        {tickerItems.map((item, index) => {
          const TrendIcon = item.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          const trendClass = item.trend === 'up' ? 'text-emerald-500' : 'text-rose-500';

          return (
            <div
              key={`${item.pair}-${index}`}
              className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 shadow-sm"
            >
              <span className="font-medium text-slate-900">{item.pair}</span>
              <span className="font-mono text-slate-600">{item.rate}</span>
              <TrendIcon className={`h-4 w-4 ${trendClass}`} />
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
