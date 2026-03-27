'use client';
import { useQuery } from '@tanstack/react-query';
import { Plane } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function TravelPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', 'travel'],
    queryFn: () => api.wallets.getTransactions({ page: 1, limit: 8 }).then((r) => r.data),
  });

  const transactions = data?.transactions || [];

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Travel History</h1>
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : error ? (
        <Card className="border-error bg-red-50 text-error">Could not load travel-related transactions.</Card>
      ) : transactions.length ? (
        <div className="space-y-3">
          {transactions.map((tx: { id: string; fromCurrency: string; toCurrency: string; createdAt: string; status: string }) => (
            <Card key={tx.id}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-semibold text-text-primary">{tx.fromCurrency} → {tx.toCurrency}</p>
                  <p className="text-sm text-text-secondary">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <p className="text-sm text-brand-amber font-medium">{tx.status}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-8">
          <Plane className="w-10 h-10 text-brand-amber mx-auto mb-3" />
          <p className="font-semibold text-text-primary">No travel activity yet</p>
          <p className="text-sm text-text-secondary mt-1">Your cross-border travel swaps and spending records will appear here.</p>
        </Card>
      )}
    </div>
  );
}
