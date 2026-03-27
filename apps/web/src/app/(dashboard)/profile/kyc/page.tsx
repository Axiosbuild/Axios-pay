'use client';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';

export default function KycPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['me', 'kyc'],
    queryFn: () => api.users.getMe().then((r) => r.data),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">KYC Verification</h1>
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : error ? (
        <Card className="border-error bg-red-50 text-error">Unable to fetch KYC status.</Card>
      ) : (
        <Card className="text-center py-8">
          <ShieldCheck className="w-10 h-10 text-brand-amber mx-auto mb-3" />
          <p className="font-semibold text-text-primary mb-2">Current verification state</p>
          <div className="flex justify-center"><Badge status={data?.kycStatus || 'PENDING'} /></div>
          <p className="text-sm text-text-secondary mt-3">Upload valid identity documents from your profile to complete verification.</p>
        </Card>
      )}
    </div>
  );
}
