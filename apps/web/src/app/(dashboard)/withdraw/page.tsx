'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { PINVerifyModal } from '@/components/PINVerifyModal';
import { PILOT_COUNTRIES } from '@/lib/countries';
import { useAuthStore } from '@/store/authStore';

interface Bank {
  code: string;
  name: string;
}

interface Wallet {
  id: string;
  currency: string;
  balance: string;
}

export default function WithdrawPage() {
  const { user } = useAuthStore();
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('1000');
  const [currency, setCurrency] = useState('NGN');
  const [narration, setNarration] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [mode, setMode] = useState<'bank' | 'axios'>('bank');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [pinToken, setPinToken] = useState<string | null>(null);

  const { data: banks } = useQuery({
    queryKey: ['banks', currency],
    queryFn: () =>
      api.wallets
        .getBanks({ currency, countryCode: selectedCountry.code })
        .then((r) => r.data as Bank[]),
    enabled: Boolean(currency),
  });

  const { data: wallets } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => api.wallets.getAll().then((r) => r.data as Wallet[]),
  });

  const walletCurrencies = useMemo(() => {
    const unique = Array.from(new Set((wallets || []).map((w) => w.currency)));
    return unique.filter((curr) => PILOT_COUNTRIES.some((country) => country.currency === curr));
  }, [wallets]);

  const selectedCountry = useMemo(() => {
    return PILOT_COUNTRIES.find((country) => country.currency === currency) ?? PILOT_COUNTRIES[0];
  }, [currency]);

  useEffect(() => {
    if (!walletCurrencies.length) return;
    if (walletCurrencies.includes(currency)) return;

    if (user?.currency && walletCurrencies.includes(user.currency)) {
      setCurrency(user.currency);
      return;
    }

    setCurrency(walletCurrencies[0]);
  }, [walletCurrencies, currency, user?.currency]);

  const selectedBalance = useMemo(() => {
    const wallet = (wallets || []).find((w) => w.currency === currency);
    return wallet ? Number(wallet.balance) : 0;
  }, [wallets, currency]);

  useEffect(() => {
    if (accountNumber.length < 6 || !bankCode || mode !== 'bank') return;
    api.wallets
      .resolveBankAccount({
        bankCode,
        accountNumber,
        currency,
        countryCode: selectedCountry.code,
      })
      .then((r) => setAccountName(r.data?.accountName || ''))
      .catch(() => setAccountName(''));
  }, [accountNumber, bankCode, currency, selectedCountry.code, mode]);

  useEffect(() => {
    if (!pinToken || !pending) return;
    setLoading(true);
    setMessage('');
    const request =
      mode === 'bank'
        ? api.wallets.sendTransfer(
            {
              bankCode,
              accountNumber,
              accountName,
              amount: Number(amount),
              narration: narration || undefined,
              currency,
              countryCode: selectedCountry.code,
            },
            pinToken
          )
        : api.wallets.transferToAxiosUser(
            {
              recipientEmail,
              amount: Number(amount),
              narration: narration || undefined,
              senderCurrency: currency,
            },
            pinToken
          );
    request
      .then((r) =>
        setMessage(
          r.data?.status === 'SUCCESS'
            ? mode === 'bank'
              ? `Withdrawal successful (${currency})`
              : `Transfer successful (${currency})`
            : mode === 'bank'
              ? 'Withdrawal failed'
              : 'Transfer failed'
        )
      )
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        setMessage(e?.response?.data?.message || e?.message || 'Withdrawal failed.');
      })
      .finally(() => {
        setLoading(false);
        setPending(false);
        setPinToken(null);
      });
  }, [pinToken, pending, bankCode, accountNumber, accountName, amount, narration, mode, recipientEmail, currency, selectedCountry.code]);

  function requestWithdraw() {
    setPending(true);
    setPinOpen(true);
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Withdraw</h1>
      <Card className="space-y-4">
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('bank')} className={`px-3 py-2 rounded-btn text-sm ${mode === 'bank' ? 'bg-brand-amber text-white' : 'bg-subtle text-text-secondary'}`}>Bank Transfer</button>
          <button type="button" onClick={() => setMode('axios')} className={`px-3 py-2 rounded-btn text-sm ${mode === 'axios' ? 'bg-brand-amber text-white' : 'bg-subtle text-text-secondary'}`}>Axios Pay User</button>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-text-primary">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
          >
            {walletCurrencies.map((walletCurrency) => {
              const country = PILOT_COUNTRIES.find((entry) => entry.currency === walletCurrency);
              return (
                <option key={walletCurrency} value={walletCurrency}>
                  {country?.flag || '🌍'} {walletCurrency} - {country?.name || 'Wallet'}
                </option>
              );
            })}
          </select>
        </div>
        <p className="text-sm text-text-secondary">
          Available {currency} balance: {selectedBalance.toFixed(currency === 'UGX' ? 0 : 2)}
        </p>
        {mode === 'bank' ? (
          <>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-primary">Bank</label>
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
              >
                <option value="">Select bank</option>
                {(banks || []).map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-primary">Account Number</label>
                <input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 18))}
                  className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
                  placeholder="Enter account number"
                />
              </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-primary">Account Name</label>
              <input
                value={accountName}
                readOnly
                className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-subtle focus:outline-none"
                placeholder="Resolved account name"
              />
            </div>
          </>
        ) : (
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-primary">Recipient Axios Pay Email</label>
            <input
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
              placeholder="recipient@example.com"
            />
            <p className="text-xs text-text-muted">Mock internal transfer for demo.</p>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-sm font-medium text-text-primary">Amount (₦)</label>
          <input
            type="number"
            min={1000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-text-primary">Narration (optional)</label>
          <input
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            className="w-full px-3 py-2.5 rounded-btn border border-border text-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber"
          />
        </div>
        <Button
          onClick={requestWithdraw}
          loading={loading}
            disabled={
              mode === 'bank'
              ? (!bankCode || accountNumber.length < 6 || !accountName || Number(amount) < 1000)
              : (!recipientEmail || Number(amount) < 100)
            }
          className="w-full"
        >
          {mode === 'bank' ? 'Withdraw to Bank' : 'Transfer to Axios Pay User'}
        </Button>
        {message && <div className="p-3 bg-brand-bg rounded-btn text-sm text-text-primary">{message}</div>}
      </Card>

      <PINVerifyModal
        open={pinOpen}
        onClose={() => {
          if (!loading) {
            setPinOpen(false);
            setPending(false);
          }
        }}
        onVerified={(token) => {
          setPinToken(token);
          setPinOpen(false);
        }}
      />
    </div>
  );
}
