'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

const schema = z.object({
  currency: z.enum(['NGN', 'UGX', 'KES', 'GHS', 'ZAR']),
  amount: z.coerce.number().min(100, 'Minimum deposit is 100'),
});

type FormData = z.infer<typeof schema>;

export default function DepositPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'NGN' },
  });

  const currency = watch('currency');
  const amount = watch('amount');

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError('');
    try {
      const result = await api.wallets.fund(data);
      const paymentUrl = result.data?.paymentUrl;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }

      setError('Payment link unavailable. Please try again.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Failed to initiate payment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold text-text-primary mb-6">Fund Wallet</h1>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-error">{error}</div>}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Currency</label>
            <select
              {...register('currency')}
              className="w-full px-3 py-2.5 rounded-btn border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
            >
              <option value="NGN">🇳🇬 Nigerian Naira (NGN)</option>
              <option value="UGX">🇺🇬 Ugandan Shilling (UGX)</option>
              <option value="KES">🇰🇪 Kenyan Shilling (KES)</option>
              <option value="GHS">🇬🇭 Ghanaian Cedi (GHS)</option>
              <option value="ZAR">🇿🇦 South African Rand (ZAR)</option>
            </select>
          </div>

          <Input
            label="Amount"
            type="number"
            min="100"
            placeholder="1000"
            {...register('amount')}
            error={errors.amount?.message}
          />

          {amount >= 100 && (
            <div className="bg-brand-bg rounded-btn p-3 text-sm space-y-1">
              <p className="text-text-secondary">You will be redirected to Interswitch — a trusted payment processor — to complete your {currency} {amount} deposit.</p>
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">Proceed to Payment</Button>
        </form>
      </Card>
    </div>
  );
}
