'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CURRENCY_META, CurrencyCode, DEFAULT_CORRIDOR_RATES, SUPPORTED_CORRIDORS, getCurrencyNameDisplay } from '@/lib/currencies';

interface RateRow {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: string;
}

interface RatesResponse {
  rates?: Array<{ fromCurrency: string; toCurrency: string; rate: string }>;
}

export function RatesGrid() {
  const { data } = useQuery({
    queryKey: ['rates-grid'],
    queryFn: () => api.rates.getAll().then((r) => r.data as RatesResponse),
    retry: 0,
  });

  const apiRates = (data?.rates || []).reduce<Record<string, string>>((acc, item) => {
    if (item.fromCurrency in CURRENCY_META && item.toCurrency in CURRENCY_META) {
      acc[`${item.fromCurrency}-${item.toCurrency}`] = item.rate;
    }
    return acc;
  }, {});

  const rows: RateRow[] = SUPPORTED_CORRIDORS.map(({ from, to }) => ({
    fromCurrency: from,
    toCurrency: to,
    rate: apiRates[`${from}-${to}`] || DEFAULT_CORRIDOR_RATES[`${from}-${to}`] || '-',
  }));

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {rows.map((row) => (
        <div key={`${row.fromCurrency}-${row.toCurrency}`} className="bg-surface rounded-card border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-text-primary">
                {getCurrencyNameDisplay(row.fromCurrency)}
              </p>
              <p className="text-sm font-medium text-text-primary mt-1">
                → {getCurrencyNameDisplay(row.toCurrency)}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-success rounded-full" />
              <span className="text-xs text-success font-medium">Live</span>
            </span>
          </div>
          <p className="font-mono text-2xl font-bold text-brand-amber mt-4">{row.rate}</p>
        </div>
      ))}
    </div>
  );
}
