'use client';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function NotificationsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', 'notifications'],
    queryFn: () => api.wallets.getTransactions({ page: 1, limit: 6 }).then((r) => r.data),
  });

  const transactions = data?.transactions || [];

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Notifications</h1>
      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : error ? (
        <Card className="border-error bg-red-50 text-error">Unable to load notifications.</Card>
      ) : transactions.length ? (
        <div className="space-y-3">
          {transactions.map((tx: { id: string; type: string; createdAt: string; status: string }) => (
            <Card key={tx.id}>
              <p className="font-medium text-text-primary">{tx.type} update</p>
              <p className="text-sm text-text-secondary">{tx.status} • {new Date(tx.createdAt).toLocaleString()}</p>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-8">
          <Bell className="w-10 h-10 text-brand-amber mx-auto mb-3" />
          <p className="font-semibold text-text-primary">No notifications yet</p>
          <p className="text-sm text-text-secondary mt-1">Transaction, security, and alert updates will appear here.</p>
        </Card>
      )}
    </div>
  );
}
