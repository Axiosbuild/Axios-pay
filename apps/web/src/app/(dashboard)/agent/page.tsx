'use client';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function AgentPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['me', 'agent'],
    queryFn: () => api.users.getMe().then((r) => r.data),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Agent Portal</h1>
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : error ? (
        <Card className="border-error bg-red-50 text-error">Unable to load agent profile.</Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <p className="text-sm text-text-muted">Agent identity</p>
            <p className="text-lg font-semibold text-text-primary mt-1">{data?.firstName} {data?.lastName}</p>
            <p className="text-sm text-text-secondary">{data?.email}</p>
          </Card>
          <Card className="text-center py-8">
            <ShieldCheck className="w-10 h-10 text-brand-amber mx-auto mb-3" />
            <p className="font-semibold text-text-primary">No delegated clients yet</p>
            <p className="text-sm text-text-secondary mt-1">Assigned customer portfolios and commission insights will show here.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
