'use client';
import { useQuery } from '@tanstack/react-query';
import { LineChart } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminRatesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'rates'],
    queryFn: () => api.rates.getAll().then((r) => r.data),
  });

  const rates = data?.rates || [];

  return (
    <div className="min-h-screen bg-page p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Admin • Rates</h1>
        {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : error ? (
          <Card className="border-error bg-red-50 text-error">Unable to fetch rates.</Card>
        ) : rates.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rates.slice(0, 10).map((rate: { fromCurrency: string; toCurrency: string; rate: string }) => (
              <Card key={`${rate.fromCurrency}-${rate.toCurrency}`}>
                <p className="font-semibold text-text-primary">{rate.fromCurrency}/{rate.toCurrency}</p>
                <p className="text-2xl font-mono text-brand-amber mt-2">{rate.rate}</p>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-8">
            <LineChart className="w-10 h-10 text-brand-amber mx-auto mb-3" />
            <p className="font-semibold text-text-primary">No rates available</p>
          </Card>
        )}
      </div>
    </div>
  );
}
