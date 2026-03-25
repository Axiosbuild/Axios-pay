import { ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import { Badge } from './Badge';

const TYPE_ICONS = {
  DEPOSIT: <ArrowDownLeft className="w-4 h-4 text-success" />,
  SWAP: <RefreshCw className="w-4 h-4 text-brand-amber" />,
  WITHDRAWAL: <ArrowUpRight className="w-4 h-4 text-error" />,
};

interface Transaction {
  id: string;
  type: string;
  status: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string | number;
  toAmount: string | number;
  narration?: string;
  createdAt: string;
}

export function TransactionRow({ tx }: { tx: Transaction }) {
  const fmt = (n: string | number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(Number(n));
  const date = new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center flex-shrink-0">
        {TYPE_ICONS[tx.type as keyof typeof TYPE_ICONS] || <RefreshCw className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{tx.narration || tx.type}</p>
        <p className="text-xs text-text-muted">{date}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-mono font-medium text-text-primary">
          {fmt(tx.fromAmount)} {tx.fromCurrency}
          {tx.fromCurrency !== tx.toCurrency && ` → ${fmt(tx.toAmount)} ${tx.toCurrency}`}
        </p>
        <Badge status={tx.status} />
      </div>
    </div>
  );
}
