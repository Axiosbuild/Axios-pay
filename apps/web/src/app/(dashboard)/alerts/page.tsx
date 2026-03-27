'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function AlertsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rates', 'all', 'alerts'],
    queryFn: () => api.rates.getAll().then((r) => r.data),
  });

  const candidates = useMemo(() => (data?.rates || []).slice(0, 3), [data]);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Rate Alerts</h1>
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : error ? (
        <Card className="border-error bg-red-50 text-error">Unable to fetch alert corridors right now.</Card>
      ) : (
        <div className="space-y-4">
          {candidates.length ? candidates.map((item: { fromCurrency: string; toCurrency: string; rate: string }) => (
            <Card key={`${item.fromCurrency}-${item.toCurrency}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-text-primary">{item.fromCurrency} → {item.toCurrency}</p>
                  <p className="text-sm text-text-secondary">Current: {item.rate}. Set threshold from the mobile app soon.</p>
                </div>
                <Bell className="w-5 h-5 text-brand-amber" />
              </div>
            </Card>
          )) : (
            <Card className="text-center py-8">
              <Bell className="w-10 h-10 text-brand-amber mx-auto mb-3" />
              <p className="font-semibold text-text-primary">No alert corridors yet</p>
              <p className="text-sm text-text-secondary mt-1">Create your first rate alert to get notified when your target rate is reached.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
