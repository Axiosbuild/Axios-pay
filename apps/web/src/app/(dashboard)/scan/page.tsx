'use client';
import { ScanLine } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function ScanPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Scan & Pay</h1>
      <Card className="text-center py-10">
        <ScanLine className="w-12 h-12 text-brand-amber mx-auto mb-3" />
        <p className="font-semibold text-text-primary">No QR payments yet</p>
        <p className="text-sm text-text-secondary mt-1">Scan merchant QR codes to pay directly from your wallet balances.</p>
      </Card>
    </div>
  );
}
