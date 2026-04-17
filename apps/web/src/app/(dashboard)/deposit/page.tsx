'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OTPInput } from '@/components/ui/OTPInput';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  amount: z.coerce.number().positive().min(100, 'Minimum deposit is ₦100'),
});

type FormData = z.infer<typeof schema>;
type Tab = 'card' | 'bank' | 'ussd' | 'auto';

type LegacyWebpayCheckoutConfig = {
  merchant_code: string;
  pay_item_id: string;
  txn_ref: string;
  site_redirect_url: string;
  amount: number;
  currency: number;
  cust_name: string;
  cust_email: string;
  cust_id: string;
  mode: string;
  onComplete: (response: { resp?: string }) => void;
};

export default function DepositPage() {
  const [tab, setTab] = useState<Tab>('card');
  const [cardLoading, setCardLoading] = useState(false);
  const [ussdLoading, setUssdLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [ussdCode, setUssdCode] = useState('');
  const [inlineMessage, setInlineMessage] = useState('');
  const [recurringAmount, setRecurringAmount] = useState('100');
  const [recurringFrequency, setRecurringFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [recurringItems, setRecurringItems] = useState<
    Array<{ id: string; amount: string; frequency: string; nextRunAt: string }>
  >([]);
  const [otpSessionToken, setOtpSessionToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpTxRef, setOtpTxRef] = useState('');
  const [transferToken, setTransferToken] = useState('');
  const [otpAmount, setOtpAmount] = useState<number | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 100 },
  });

  const {
    register: registerUssd,
    handleSubmit: handleUssdSubmit,
    watch: watchUssd,
    formState: { errors: ussdErrors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 100 },
  });

  const amount = Number(watch('amount')) || 0;
  const ussdAmount = Number(watchUssd('amount')) || 0;
  const fee = useMemo(() => (amount > 0 ? amount * 0.015 : 0), [amount]);
  const total = useMemo(() => amount + fee, [amount, fee]);

  const virtualAccountNumber = '1022334455';
  const virtualBankName = 'Interswitch Virtual Bank';
  const merchantCode = process.env.NEXT_PUBLIC_INTERSWITCH_MERCHANT_CODE || 'MERCHANT_CODE';

  const interswitchMode = process.env.NEXT_PUBLIC_INTERSWITCH_MODE || 'TEST';
  const inlineScriptUrl =
    process.env.NEXT_PUBLIC_INTERSWITCH_INLINE_SCRIPT_URL ||
    (interswitchMode.toUpperCase() === 'LIVE'
      ? 'https://newwebpay.interswitchng.com/inline-checkout.js'
      : 'https://newwebpay.qa.interswitchng.com/inline-checkout.js');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = inlineScriptUrl;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [inlineScriptUrl]);

  useEffect(() => {
    if (tab !== 'bank') return;
    const timer = window.setInterval(() => {
      api.wallets.getTransactions({ page: 1, limit: 20, type: 'DEPOSIT' }).catch(() => {});
    }, 30000);
    return () => window.clearInterval(timer);
  }, [tab]);

  useEffect(() => {
    if (tab !== 'ussd') return;
    const timer = window.setInterval(() => {
      api.wallets.getTransactions({ page: 1, limit: 20, type: 'DEPOSIT' }).catch(() => {});
    }, 30000);
    return () => window.clearInterval(timer);
  }, [tab]);

  useEffect(() => {
    if (tab !== 'auto') return;
    api.wallets
      .listRecurring()
      .then((r) => setRecurringItems(r.data || []))
      .catch(() => setRecurringItems([]));
  }, [tab]);

  async function copyText(value: string, successMessage: string) {
    await navigator.clipboard.writeText(value);
    setCopyMessage(successMessage);
    window.setTimeout(() => setCopyMessage(''), 2000);
  }

  function buildTransactionReference(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    throw new Error('Browser does not support secure random generation. Please use a modern browser.');
  }

  async function requestPaymentOtp(amountToPay: number): Promise<boolean> {
    if (!user?.phoneNumber) {
      setError('A verified phone number is required to request OTP.');
      return false;
    }

    const transactionReference = buildTransactionReference();
    setOtpLoading(true);
    setError('');
    try {
      const result = await api.otp.request({
        customerPhone: user.phoneNumber,
        transactionReference,
        amount: amountToPay,
      });
      setOtpSessionToken(result.data?.sessionToken ?? '');
      setOtpTxRef(transactionReference);
      setOtpAmount(amountToPay);
      setTransferToken('');
      setOtpVerified(false);
      setOtpCode('');
      setInlineMessage('OTP sent. Enter the code to continue.');
      return true;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
      setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Failed to request OTP.');
      return false;
    } finally {
      setOtpLoading(false);
    }
  }

  async function verifyPaymentOtp() {
    if (!otpSessionToken || !otpTxRef || otpCode.length !== 6) {
      setError('Enter the 6-digit OTP code.');
      return;
    }
    setOtpLoading(true);
    setError('');
    try {
      const result = await api.otp.verify({
        sessionToken: otpSessionToken,
        otp: otpCode,
        transactionReference: otpTxRef,
      });
      setTransferToken(result.data?.transferToken ?? '');
      setOtpVerified(true);
      setInlineMessage('OTP verified. You can now complete this payment.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
      setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || 'OTP verification failed.');
    } finally {
      setOtpLoading(false);
    }
  }

  async function resendPaymentOtp() {
    if (!user?.phoneNumber || !otpTxRef || !otpAmount) return;
    setOtpLoading(true);
    setError('');
    try {
      const result = await api.otp.resend({
        sessionToken: otpSessionToken || undefined,
        customerPhone: user.phoneNumber,
        transactionReference: otpTxRef,
        amount: otpAmount,
      });
      setOtpSessionToken(result.data?.sessionToken ?? '');
      setOtpCode('');
      setOtpVerified(false);
      setTransferToken('');
      setInlineMessage('OTP resent.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
      setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Failed to resend OTP.');
    } finally {
      setOtpLoading(false);
    }
  }

  async function initiateDeposit(
    amountToPay: number,
    payload: { transferToken: string; transactionReference: string }
  ): Promise<{ paymentUrl: string; reference: string }> {
    const result = await api.wallets.initiateDeposit({
      amount: amountToPay,
      transferToken: payload.transferToken,
      transactionReference: payload.transactionReference,
    });
    const paymentUrl = result.data?.paymentUrl as string | undefined;
    const reference = result.data?.reference as string | undefined;
    if (!paymentUrl || !reference) throw new Error('Payment link unavailable. Please try again.');
    return { paymentUrl, reference };
  }

  async function verifyInlineDeposit(reference: string) {
    try {
      const response = await api.wallets.verifyDeposit(reference);
      const status = response.data?.status as string | undefined;
      if (status === 'PAID') setInlineMessage('Payment successful and wallet credited.');
      else if (status === 'PENDING') setInlineMessage('Payment submitted. Verification in progress.');
      else setInlineMessage('Payment failed verification.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setInlineMessage(e?.response?.data?.message || e?.message || 'Unable to verify payment.');
    }
  }

  async function onCardSubmit(data: FormData) {
    setCardLoading(true);
    setError('');
    setInlineMessage('');
    try {
      if (!otpVerified || !transferToken || !otpTxRef || otpAmount !== data.amount) {
        if (otpAmount !== null && otpAmount !== data.amount) {
          setOtpVerified(false);
          setTransferToken('');
        }
        await requestPaymentOtp(data.amount);
        return;
      }

      const { reference } = await initiateDeposit(data.amount, {
        transferToken,
        transactionReference: otpTxRef,
      });
      setOtpSessionToken('');
      setOtpCode('');
      setOtpTxRef('');
      setTransferToken('');
      setOtpAmount(null);
      setOtpVerified(false);
      const checkout = (window as Window & {
        webpayCheckout?: (config: LegacyWebpayCheckoutConfig) => void;
      }).webpayCheckout;

      if (!checkout) {
        setError('Inline checkout is unavailable. Please refresh and try again.');
        return;
      }

      checkout({
        merchant_code: process.env.NEXT_PUBLIC_INTERSWITCH_MERCHANT_CODE || '',
        pay_item_id: process.env.NEXT_PUBLIC_INTERSWITCH_PAY_ITEM_ID || '',
        txn_ref: reference,
        site_redirect_url: `${window.location.origin}/dashboard/deposit/callback`,
        amount: Math.round(data.amount * 100),
        currency: 566,
        cust_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        cust_email: user?.email || '',
        cust_id: user?.id || '',
        mode: interswitchMode,
        onComplete: (response: { resp?: string }) => {
          if (response.resp === '00') verifyInlineDeposit(reference);
          else setInlineMessage('Payment was not completed. Please try again.');
        },
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e?.message || 'Failed to initiate payment.');
    } finally {
      setCardLoading(false);
    }
  }

  async function onGenerateUssd(data: FormData) {
    setUssdLoading(true);
    setError('');
    try {
      if (!otpVerified || !transferToken || !otpTxRef || otpAmount !== data.amount) {
        if (otpAmount !== null && otpAmount !== data.amount) {
          setOtpVerified(false);
          setTransferToken('');
        }
        await requestPaymentOtp(data.amount);
        return;
      }

      const result = await api.wallets.initiateDeposit({
        amount: data.amount,
        transferToken,
        transactionReference: otpTxRef,
      });
      const reference = result.data?.reference as string | undefined;
      if (!reference) {
        setError('Unable to generate USSD code. Please try again.');
        return;
      }
      setOtpSessionToken('');
      setOtpCode('');
      setOtpTxRef('');
      setTransferToken('');
      setOtpAmount(null);
      setOtpVerified(false);
      setUssdCode(`*322*${merchantCode}*${Math.round(data.amount)}*${reference}#`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e?.message || 'Failed to generate USSD code.');
    } finally {
      setUssdLoading(false);
    }
  }

  async function setupRecurringDeposit() {
    setRecurringLoading(true);
    setError('');
    try {
      await api.wallets.createRecurring({
        amount: Number(recurringAmount),
        frequency: recurringFrequency,
      });
      setInlineMessage('Auto-Deposit schedule created successfully.');
      const recurringResult = await api.wallets.listRecurring();
      setRecurringItems(recurringResult.data || []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e?.message || 'Unable to set up Auto-Deposit.');
    } finally {
      setRecurringLoading(false);
    }
  }

  async function cancelRecurring(id: string) {
    try {
      await api.wallets.cancelRecurring(id);
      setRecurringItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-lg w-full">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Deposit</h1>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {[
          { label: 'Pay via Interswitch Link', value: 'card' as const },
          { label: 'Bank Transfer', value: 'bank' as const },
          { label: 'USSD', value: 'ussd' as const },
          { label: 'Auto-Deposit', value: 'auto' as const },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={`px-4 py-2 min-h-11 rounded-full text-sm whitespace-nowrap transition-all duration-200 ${
              tab === item.value
                ? 'bg-brand-amber text-white'
                : 'bg-subtle text-text-secondary hover:bg-border'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {copyMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-btn text-sm text-success">{copyMessage}</div>
      )}

      {tab === 'card' && (
        <Card>
          <form onSubmit={handleSubmit(onCardSubmit)} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-error">{error}</div>}
            {inlineMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-btn text-sm text-success">{inlineMessage}</div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">₦</span>
                <input
                  type="number"
                  min="100"
                  placeholder="1000"
                  className={`w-full pl-8 pr-3 py-2.5 rounded-btn border text-text-primary placeholder-text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-transparent transition-colors ${
                    errors.amount?.message ? 'border-error' : 'border-border'
                  }`}
                  {...register('amount')}
                />
              </div>
              {errors.amount?.message && <p className="text-sm text-error">{errors.amount.message}</p>}
            </div>

            <p className="text-xs text-text-muted">Minimum amount: ₦100</p>

            {amount >= 100 && (
              <div className="bg-brand-bg rounded-btn p-3 text-sm space-y-1">
                <p className="text-text-secondary">Fee: 1.5% = ₦{fee.toFixed(2)}</p>
                <p className="text-text-primary font-medium">You will be charged ₦{total.toFixed(2)}</p>
              </div>
            )}

            <div className="bg-brand-bg rounded-btn p-3 space-y-3">
              <p className="text-sm text-text-secondary">Step 1: Verify OTP before payment initiation.</p>
              {otpVerified && otpAmount === amount ? (
                <p className="text-sm text-success">OTP verified. Proceed to pay.</p>
              ) : (
                <>
                  <OTPInput value={otpCode} onChange={setOtpCode} />
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" className="w-full" loading={otpLoading} onClick={() => requestPaymentOtp(amount)}>
                      Request OTP
                    </Button>
                    <Button type="button" className="w-full" loading={otpLoading} onClick={() => verifyPaymentOtp()}>
                      Verify OTP
                    </Button>
                  </div>
                  {otpSessionToken && (
                    <Button type="button" variant="ghost" className="w-full" loading={otpLoading} onClick={() => resendPaymentOtp()}>
                      Resend OTP
                    </Button>
                  )}
                </>
              )}
            </div>

            <Button type="submit" loading={cardLoading} className="w-full">
              Pay with Card
            </Button>
          </form>
        </Card>
      )}

      {tab === 'bank' && (
        <Card className="space-y-4">
          <div className="bg-brand-bg rounded-btn p-3">
            <p className="text-sm text-text-secondary">Dedicated virtual account</p>
            <p className="text-lg font-semibold text-text-primary mt-1">{virtualAccountNumber}</p>
            <p className="text-sm text-text-secondary">{virtualBankName}</p>
          </div>

          <Button type="button" variant="ghost" className="w-full" onClick={() => copyText(virtualAccountNumber, 'Account number copied')}>
            <Copy className="w-4 h-4" />
            Copy Account Number
          </Button>

          <div className="text-sm text-text-secondary space-y-2">
            <p>1. Open your banking app or USSD banking.</p>
            <p>2. Transfer to the virtual account above.</p>
            <p>3. Your wallet updates automatically once payment is confirmed.</p>
            <p className="text-xs text-text-muted">Checking for new deposits every 30 seconds.</p>
          </div>
        </Card>
      )}

      {tab === 'ussd' && (
        <Card>
          <form onSubmit={handleUssdSubmit(onGenerateUssd)} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-error">{error}</div>}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">₦</span>
                <input
                  type="number"
                  min="100"
                  placeholder="1000"
                  className={`w-full pl-8 pr-3 py-2.5 rounded-btn border text-text-primary placeholder-text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-transparent transition-colors ${
                    ussdErrors.amount?.message ? 'border-error' : 'border-border'
                  }`}
                  {...registerUssd('amount')}
                />
              </div>
              {ussdErrors.amount?.message && <p className="text-sm text-error">{ussdErrors.amount.message}</p>}
            </div>

            <div className="bg-brand-bg rounded-btn p-3 space-y-3">
              <p className="text-sm text-text-secondary">Step 1: Verify OTP before USSD code generation.</p>
              {otpVerified && otpAmount === ussdAmount ? (
                <p className="text-sm text-success">OTP verified. You can generate your code.</p>
              ) : (
                <>
                  <OTPInput value={otpCode} onChange={setOtpCode} />
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" className="w-full" loading={otpLoading} onClick={() => requestPaymentOtp(ussdAmount)}>
                      Request OTP
                    </Button>
                    <Button type="button" className="w-full" loading={otpLoading} onClick={() => verifyPaymentOtp()}>
                      Verify OTP
                    </Button>
                  </div>
                  {otpSessionToken && (
                    <Button type="button" variant="ghost" className="w-full" loading={otpLoading} onClick={() => resendPaymentOtp()}>
                      Resend OTP
                    </Button>
                  )}
                </>
              )}
            </div>

            <Button type="submit" loading={ussdLoading} className="w-full">
              Generate Code
            </Button>

            {ussdCode && (
              <div className="bg-brand-bg rounded-btn p-3 text-sm space-y-3">
                <p className="text-text-secondary">Dial this code to pay:</p>
                <p className="font-mono text-text-primary break-all">{ussdCode}</p>
                <Button type="button" variant="ghost" className="w-full" onClick={() => copyText(ussdCode, 'USSD code copied')}>
                  <Copy className="w-4 h-4" />
                  Copy Code
                </Button>
              </div>
            )}

            <p className="text-xs text-text-muted">We check for confirmed USSD deposits every 30 seconds.</p>
          </form>
        </Card>
      )}

      {tab === 'auto' && (
        <Card className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Amount (₦)</label>
            <input
              type="number"
              min={100}
              value={recurringAmount}
              onChange={(e) => setRecurringAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Frequency</label>
            <select
              value={recurringFrequency}
              onChange={(e) => setRecurringFrequency(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')}
              className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          <Button
            type="button"
            onClick={setupRecurringDeposit}
            disabled={!user?.cardTokenizedAt || Number(recurringAmount) < 100}
            loading={recurringLoading}
            className="w-full"
          >
            Set Up Auto-Deposit
          </Button>
          {!user?.cardTokenizedAt && (
            <p className="text-xs text-text-muted">
              Auto-Deposit is available after your first successful card payment with tokenized card.
            </p>
          )}
          <div className="space-y-2">
            {recurringItems.map((item) => (
              <div key={item.id} className="border border-border rounded-btn p-3">
                <p className="text-sm text-text-primary">
                  ₦{Number(item.amount).toFixed(2)} • {item.frequency}
                </p>
                <p className="text-xs text-text-muted">Next run: {new Date(item.nextRunAt).toLocaleString()}</p>
                <Button type="button" variant="ghost" onClick={() => cancelRecurring(item.id)} className="mt-2">
                  Cancel
                </Button>
              </div>
            ))}
            {!recurringItems.length && <p className="text-xs text-text-muted">No active recurring deposits.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}
