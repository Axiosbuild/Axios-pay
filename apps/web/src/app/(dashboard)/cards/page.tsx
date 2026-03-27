'use client';
import { useQuery } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function CardsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['wallets', 'cards'],
    queryFn: () => api.wallets.getAll().then((r) => r.data),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Virtual Cards</h1>
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : error ? (
        <Card className="border-error bg-red-50 text-error">Unable to load card funding sources.</Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <p className="text-sm text-text-muted">Eligible wallets</p>
            <p className="text-lg text-text-primary font-semibold mt-1">{(data || []).length} wallet(s) available for card funding</p>
          </Card>
          <Card className="text-center py-8">
            <CreditCard className="w-10 h-10 text-brand-amber mx-auto mb-3" />
            <p className="font-semibold text-text-primary">No cards issued yet</p>
            <p className="text-sm text-text-secondary mt-1">Create your first virtual card for online and travel payments.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
