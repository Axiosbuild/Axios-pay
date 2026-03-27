'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { PINVerifyModal } from '@/components/PINVerifyModal';

type BillsTab = 'airtime' | 'bills';

interface Category {
  id: string;
  name: string;
}

interface Biller {
  id: string;
  name: string;
}

interface Wallet {
  id: string;
  currency: string;
  balance: string;
}

export default function BillsPage() {
  const [tab, setTab] = useState<BillsTab>('airtime');
  const [airtimeNetwork, setAirtimeNetwork] = useState<'MTN' | 'Airtel' | 'Glo' | '9mobile'>('MTN');
  const [airtimePhone, setAirtimePhone] = useState('');
  const [airtimeAmount, setAirtimeAmount] = useState('100');
  const [categoryId, setCategoryId] = useState('');
  const [billerId, setBillerId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [billAmount, setBillAmount] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [mode, setMode] = useState<'airtime' | 'bill' | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['bill-categories'],
    queryFn: () => api.bills.categories().then((r) => r.data as Category[]),
  });
  const { data: billers } = useQuery({
    queryKey: ['billers', categoryId],
    queryFn: () => api.bills.billers(categoryId).then((r) => r.data as Biller[]),
    enabled: Boolean(categoryId),
  });
  const { data: wallets } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => api.wallets.getAll().then((r) => r.data as Wallet[]),
  });

  const ngnBalance = useMemo(() => {
    const wallet = (wallets || []).find((w) => w.currency === 'NGN');
    return wallet ? Number(wallet.balance) : 0;
  }, [wallets]);

  async function validateCustomer() {
    try {
      const response = await api.bills.validate({ billerId, customerId });
      setCustomerName(response.data?.customerName || '');
    } catch {
      setCustomerName('');
    }
  }

  function startAirtime() {
    setMode('airtime');
    setPinOpen(true);
  }

  function startBillPayment() {
    setMode('bill');
    setPinOpen(true);
  }

  async function handlePinVerified(pinToken: string) {
    setLoading(true);
    setMessage('');
    try {
      if (mode === 'airtime') {
        await api.bills.airtime(
          {
            phoneNumber: airtimePhone,
            amount: Number(airtimeAmount),
            network: airtimeNetwork,
          },
          pinToken
        );
        setMessage('Airtime purchased successfully.');
      } else if (mode === 'bill') {
        await api.bills.pay(
          {
            categoryId,
            billerId,
            customerId,
            amount: Number(billAmount),
          },
          pinToken
        );
        setMessage('Bill payment successful.');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setMessage(e?.response?.data?.message || e?.message || 'Transaction failed.');
    } finally {
      setLoading(false);
      setPinOpen(false);
      setMode(null);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Bills</h1>
      <p className="text-sm text-text-secondary mb-4">Wallet balance: ₦{ngnBalance.toFixed(2)}</p>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('airtime')}
          className={`px-4 py-2 min-h-11 rounded-full text-sm transition-all duration-200 ${
            tab === 'airtime' ? 'bg-brand-amber text-white' : 'bg-subtle text-text-secondary hover:bg-border'
          }`}
        >
          Airtime
        </button>
        <button
          type="button"
          onClick={() => setTab('bills')}
          className={`px-4 py-2 min-h-11 rounded-full text-sm transition-all duration-200 ${
            tab === 'bills' ? 'bg-brand-amber text-white' : 'bg-subtle text-text-secondary hover:bg-border'
          }`}
        >
          Pay Bills
        </button>
      </div>

      {tab === 'airtime' ? (
        <Card className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Network</label>
            <select
              value={airtimeNetwork}
              onChange={(e) => setAirtimeNetwork(e.target.value as 'MTN' | 'Airtel' | 'Glo' | '9mobile')}
              className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
            >
              <option value="MTN">MTN</option>
              <option value="Airtel">Airtel</option>
              <option value="Glo">Glo</option>
              <option value="9mobile">9mobile</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Phone Number</label>
            <input
              value={airtimePhone}
              onChange={(e) => setAirtimePhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
              className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
              placeholder="08012345678"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Amount (₦)</label>
            <input
              type="number"
              min={50}
              max={50000}
              value={airtimeAmount}
              onChange={(e) => setAirtimeAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
            />
            <div className="flex gap-2">
              {[100, 200, 500, 1000].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setAirtimeAmount(String(quick))}
                  className="px-3 py-2 text-sm rounded-btn bg-subtle text-text-secondary hover:bg-border"
                >
                  ₦{quick}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={startAirtime}
            disabled={airtimePhone.length < 10 || Number(airtimeAmount) < 50 || Number(airtimeAmount) > 50000}
            loading={loading && mode === 'airtime'}
            className="w-full"
          >
            Confirm and Pay
          </Button>
        </Card>
      ) : (
        <Card className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Category</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setBillerId('');
              }}
              className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
            >
              <option value="">Select category</option>
              {(categories || []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Biller</label>
            <select
              value={billerId}
              onChange={(e) => setBillerId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
            >
              <option value="">Select biller</option>
              {(billers || []).map((biller) => (
                <option key={biller.id} value={biller.id}>
                  {biller.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Customer ID / Meter Number</label>
            <div className="flex gap-2">
              <input
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
              />
              <Button type="button" variant="ghost" onClick={validateCustomer} disabled={!billerId || !customerId}>
                Validate
              </Button>
            </div>
            {customerName && <p className="text-xs text-success">Customer: {customerName}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Amount (₦)</label>
            <input
              type="number"
              min={1}
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
            />
          </div>
          <Button
            onClick={startBillPayment}
            disabled={!categoryId || !billerId || !customerId || Number(billAmount) <= 0}
            loading={loading && mode === 'bill'}
            className="w-full"
          >
            Pay Bill
          </Button>
        </Card>
      )}

      {message && <div className="mt-4 p-3 bg-brand-bg rounded-btn text-sm text-text-primary">{message}</div>}

      <PINVerifyModal
        open={pinOpen}
        onClose={() => {
          if (!loading) {
            setPinOpen(false);
            setMode(null);
          }
        }}
        onVerified={handlePinVerified}
      />
    </div>
  );
}
