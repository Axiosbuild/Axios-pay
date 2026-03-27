'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function RateLockPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rates', 'all', 'rate-lock'],
    queryFn: () => api.rates.getAll().then((r) => r.data),
  });

  const topPairs = useMemo(() => (data?.rates || []).slice(0, 4), [data]);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Rate Lock</h1>
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : error ? (
        <Card className="border-error bg-red-50 text-error">Could not load rates for lock setup.</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topPairs.length ? topPairs.map((rate: { fromCurrency: string; toCurrency: string; rate: string }) => (
            <Card key={`${rate.fromCurrency}-${rate.toCurrency}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-text-muted">Pair</p>
                  <p className="font-semibold text-text-primary">{rate.fromCurrency}/{rate.toCurrency}</p>
                  <p className="text-2xl font-mono text-brand-amber mt-2">{rate.rate}</p>
                </div>
                <Lock className="w-5 h-5 text-brand-amber" />
              </div>
            </Card>
          )) : (
            <Card className="sm:col-span-2 text-center py-8">
              <Lock className="w-10 h-10 text-brand-amber mx-auto mb-3" />
              <p className="font-semibold text-text-primary">No rate data available</p>
              <p className="text-sm text-text-secondary mt-1">When live rates are available, you can lock a preferred corridor rate here.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
