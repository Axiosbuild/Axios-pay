import { getCurrencyDisplay } from '@/lib/currencies';

interface WalletCardProps {
  currency: string;
  balance: string | number;
  primary?: boolean;
}

export function WalletCard({ currency, balance, primary }: WalletCardProps) {
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(balance));

  return (
    <div className={`bg-surface rounded-card border p-5 shadow-sm ${primary ? 'border-brand-amber' : 'border-border'}`}>
      <p className="font-semibold text-text-primary mb-3">{getCurrencyDisplay(currency)}</p>
      <p className="text-2xl font-mono font-semibold text-text-primary">{formatted}</p>
    </div>
  );
}
