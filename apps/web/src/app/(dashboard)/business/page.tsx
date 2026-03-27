'use client';
import { useQuery } from '@tanstack/react-query';
import { Building2, Briefcase } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';

export default function BusinessPage() {
  const { data: me, isLoading, error } = useQuery({
    queryKey: ['me', 'business'],
    queryFn: () => api.users.getMe().then((r) => r.data),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Business Account</h1>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : error ? (
        <Card className="border-error bg-red-50 text-error">Unable to load business profile. Please retry.</Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-text-muted mb-1">Account holder</p>
                <p className="text-lg font-semibold text-text-primary">{me?.firstName} {me?.lastName}</p>
                <p className="text-sm text-text-secondary mt-1">{me?.email}</p>
              </div>
              <Building2 className="w-6 h-6 text-brand-amber" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">KYC status</p>
              <Badge status={me?.kycStatus || 'PENDING'} />
            </div>
            <p className="text-sm text-text-secondary mt-3">
              Upgrade to a business profile for higher limits, team access, and cross-border treasury controls.
            </p>
          </Card>

          <Card className="text-center py-8">
            <Briefcase className="w-10 h-10 text-brand-amber mx-auto mb-3" />
            <p className="font-semibold text-text-primary">No business entities linked yet</p>
            <p className="text-sm text-text-secondary mt-1">Add your company registration and tax details to activate business payouts.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
