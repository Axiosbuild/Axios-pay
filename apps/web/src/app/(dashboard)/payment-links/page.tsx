'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

interface PaymentLink {
  id: string;
  amount: string;
  description: string;
  reference: string;
  linkUrl: string;
  usesCount: number;
  isActive: boolean;
  expiresAt: string;
}

export default function PaymentLinksPage() {
  const [amount, setAmount] = useState('1000');
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  const { data: links, refetch } = useQuery({
    queryKey: ['payment-links'],
    queryFn: () => api.wallets.listPaymentLinks().then((r) => r.data as PaymentLink[]),
  });

  async function createLink() {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.wallets.createPaymentLink({
        amount: Number(amount),
        description,
        expiresAt: new Date(expiresAt).toISOString(),
      });
      setGeneratedLink(response.data?.linkUrl || '');
      setMessage('Payment link created successfully.');
      await refetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setMessage(e?.response?.data?.message || e?.message || 'Unable to create payment link.');
    } finally {
      setLoading(false);
    }
  }

  async function deactivate(id: string) {
    await api.wallets.deactivatePaymentLink(id);
    await refetch();
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setMessage('Link copied to clipboard.');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary">Payment Links</h1>
      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Create Payment Link</h2>
        <div className="space-y-1">
          <label className="text-sm font-medium text-text-primary">Amount (₦)</label>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-text-primary">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-text-primary">Expiry Date</label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
          />
        </div>
        <Button
          onClick={createLink}
          loading={loading}
          disabled={!description || !expiresAt || Number(amount) <= 0}
          className="w-full"
        >
          Create Payment Link
        </Button>
        {generatedLink && (
          <div className="space-y-2 p-3 bg-brand-bg rounded-btn">
            <p className="text-xs text-text-secondary">Generated link</p>
            <p className="text-sm font-mono break-all text-text-primary">{generatedLink}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="ghost" onClick={() => copy(generatedLink)}>
                Copy
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generatedLink)}`, '_blank')}
              >
                Share on WhatsApp
              </Button>
            </div>
          </div>
        )}
      </Card>

      {message && <div className="p-3 bg-brand-bg rounded-btn text-sm text-text-primary">{message}</div>}

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Your Payment Links</h2>
        {(links || []).map((link) => (
          <div key={link.id} className="border border-border rounded-btn p-3 space-y-1">
            <p className="text-sm font-medium text-text-primary">{link.description}</p>
            <p className="text-sm text-text-secondary">₦{Number(link.amount).toFixed(2)}</p>
            <p className="text-xs text-text-muted break-all">{link.linkUrl}</p>
            <p className="text-xs text-text-muted">
              Uses: {link.usesCount} • Expires: {new Date(link.expiresAt).toLocaleString()} •{' '}
              {link.isActive ? 'Active' : 'Inactive'}
            </p>
            {link.isActive && (
              <Button type="button" variant="ghost" onClick={() => deactivate(link.id)}>
                Deactivate
              </Button>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
