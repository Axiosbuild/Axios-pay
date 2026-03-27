'use client';
import { useQuery } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function ReferralsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['me', 'referrals'],
    queryFn: () => api.users.getMe().then((r) => r.data),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Referrals</h1>
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : error ? (
        <Card className="border-error bg-red-50 text-error">Unable to load referral profile.</Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <p className="text-sm text-text-muted">Your referral code</p>
            <p className="text-2xl font-mono text-brand-amber mt-1">{(data?.id || 'AXIOSPAY').slice(0, 8).toUpperCase()}</p>
          </Card>
          <Card className="text-center py-8">
            <Gift className="w-10 h-10 text-brand-amber mx-auto mb-3" />
            <p className="font-semibold text-text-primary">No referrals yet</p>
            <p className="text-sm text-text-secondary mt-1">Invite colleagues and earn rewards when they complete their first swap.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
