'use client';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminAgentsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'agents', 'me'],
    queryFn: () => api.users.getMe().then((r) => r.data),
  });

  return (
    <div className="min-h-screen bg-page p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Admin • Agents</h1>
        {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : error ? (
          <Card className="border-error bg-red-50 text-error">Unable to load agent roster.</Card>
        ) : (
          <Card className="text-center py-8">
            <ShieldCheck className="w-10 h-10 text-brand-amber mx-auto mb-3" />
            <p className="font-semibold text-text-primary">No agent roster yet</p>
            <p className="text-sm text-text-secondary mt-1">Signed in as {data?.email || 'Unknown'}.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
