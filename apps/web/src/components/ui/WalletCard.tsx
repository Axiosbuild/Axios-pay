const CURRENCY_META: Record<string, { flag: string; name: string }> = {
  NGN: { flag: '🇳🇬', name: 'Nigerian Naira' },
  UGX: { flag: '🇺🇬', name: 'Ugandan Shilling' },
  KES: { flag: '🇰🇪', name: 'Kenyan Shilling' },
  GHS: { flag: '🇬🇭', name: 'Ghanaian Cedi' },
  ZAR: { flag: '🇿🇦', name: 'South African Rand' },
};

interface WalletCardProps {
  currency: string;
  balance: string | number;
  primary?: boolean;
}

export function WalletCard({ currency, balance, primary }: WalletCardProps) {
  const meta = CURRENCY_META[currency] || { flag: '💱', name: currency };
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(balance));

  return (
    <div className={`bg-surface rounded-card border p-5 shadow-sm ${primary ? 'border-brand-amber' : 'border-border'}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{meta.flag}</span>
        <div>
          <p className="font-semibold text-text-primary">{currency}</p>
          <p className="text-sm text-text-muted">{meta.name}</p>
        </div>
      </div>
      <p className="text-2xl font-mono font-semibold text-text-primary">{formatted}</p>
    </div>
  );
}
