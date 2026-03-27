'use client';
import { useQuery } from '@tanstack/react-query';
import { ReceiptText } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminTransactionsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'transactions'],
    queryFn: () => api.wallets.getTransactions({ page: 1, limit: 10 }).then((r) => r.data),
  });

  const transactions = data?.transactions || [];

  return (
    <div className="min-h-screen bg-page p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Admin • Transactions</h1>
        {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : error ? (
          <Card className="border-error bg-red-50 text-error">Unable to fetch transactions.</Card>
        ) : transactions.length ? (
          <div className="space-y-3">
            {transactions.map((tx: { id: string; type: string; status: string; createdAt: string }) => (
              <Card key={tx.id}>
                <p className="font-semibold text-text-primary">{tx.type}</p>
                <p className="text-sm text-text-secondary">{tx.status} • {new Date(tx.createdAt).toLocaleString()}</p>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-8">
            <ReceiptText className="w-10 h-10 text-brand-amber mx-auto mb-3" />
            <p className="font-semibold text-text-primary">No transactions found</p>
          </Card>
        )}
      </div>
    </div>
  );
}
