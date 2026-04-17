'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, RefreshCw, SendHorizontal, ShieldCheck } from 'lucide-react';
import { CURRENCY_OPTIONS, QUICK_SWAP_DEFAULTS } from './landing-data';
import { DEFAULT_CORRIDOR_RATES, type CurrencyCode } from '@/lib/currencies';

const currencyOrder: CurrencyCode[] = ['NGN', 'UGX', 'KES', 'GHS', 'ZAR'];

function formatAmount(value: number, currency: CurrencyCode): string {
  const digits = currency === 'UGX' ? 0 : 2;
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function HeroSection() {
  const [sendCurrency, setSendCurrency] = useState<CurrencyCode>(QUICK_SWAP_DEFAULTS.sendCurrency);
  const [receiveCurrency, setReceiveCurrency] = useState<CurrencyCode>(QUICK_SWAP_DEFAULTS.receiveCurrency);
  const [sendAmount, setSendAmount] = useState(String(QUICK_SWAP_DEFAULTS.sendAmount));

  useEffect(() => {
    if (sendCurrency === receiveCurrency) {
      const nextCurrency = currencyOrder[(currencyOrder.indexOf(sendCurrency) + 1) % currencyOrder.length];
      setReceiveCurrency(nextCurrency);
    }
  }, [receiveCurrency, sendCurrency]);

  const exchangeRate = useMemo(() => {
    const direct = DEFAULT_CORRIDOR_RATES[`${sendCurrency}-${receiveCurrency}`];
    return Number(direct ?? '0');
  }, [receiveCurrency, sendCurrency]);

  const parsedAmount = useMemo(() => {
    const nextAmount = Number.parseFloat(sendAmount.replace(/,/g, ''));
    return Number.isFinite(nextAmount) ? nextAmount : 0;
  }, [sendAmount]);

  const feeAmount = parsedAmount * 0.015;
  const recipientAmount = Math.max((parsedAmount - feeAmount) * exchangeRate, 0);
  const currentSendOption = CURRENCY_OPTIONS.find((item) => item.code === sendCurrency);
  const currentReceiveOption = CURRENCY_OPTIONS.find((item) => item.code === receiveCurrency);

  return (
    <section className="relative overflow-hidden bg-[#071425] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.22),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(180deg,_rgba(7,20,37,0.92),_rgba(7,20,37,0.98))]" />
      <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-8 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200 shadow-lg shadow-emerald-950/20 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
            Live rates updated every 15 mins
          </div>

          <h1 className="mt-6 text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
            Cross-Border FX, <span className="text-emerald-300">Unlocked.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
            Flying from Lagos to Nairobi? Swap your Naira for Shillings before you land. Mid-market rates, a 1.5% flat fee, and instant settlement.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300"
            >
              Open Account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#rates"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              View Rates
            </Link>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Currencies', value: '5' },
              { label: 'Flat fee', value: '1.5%' },
              { label: 'Settlement', value: 'Instant' },
              { label: 'Trust', value: 'Bank-grade' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="relative"
        >
          <div className="absolute -left-6 top-8 h-28 w-28 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -right-4 bottom-6 h-32 w-32 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/8 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-6">
            <div className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-200">
              <span>Quick Swap</span>
              <span className="inline-flex items-center gap-2 text-emerald-300">
                <ShieldCheck className="h-4 w-4" /> Secure live pricing
              </span>
            </div>

            <div className="mt-4 space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-4 sm:p-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                  <span>You send</span>
                  <span className="text-emerald-300">Live</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
                  <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white">
                    <select
                      value={sendCurrency}
                      onChange={(event) => setSendCurrency(event.target.value as CurrencyCode)}
                      className="w-full bg-transparent text-sm outline-none"
                    >
                      {CURRENCY_OPTIONS.map((item) => (
                        <option key={item.code} value={item.code} className="text-slate-950">
                          {item.flag} {item.code}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 text-slate-300" />
                  </label>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <input
                      value={sendAmount}
                      onChange={(event) => setSendAmount(event.target.value)}
                      inputMode="decimal"
                      type="text"
                      className="w-full bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-slate-500"
                      placeholder="250,000"
                    />
                    <p className="mt-1 text-xs text-slate-400">{currentSendOption?.label}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="rounded-full border border-sky-400/20 bg-sky-400/10 p-3 text-sky-300 shadow-[0_0_30px_rgba(59,130,246,0.18)]">
                  <RefreshCw className="h-4 w-4" />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                  <span>You receive</span>
                  <span className="text-sky-300">Auto-calculated</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
                  <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white">
                    <select
                      value={receiveCurrency}
                      onChange={(event) => setReceiveCurrency(event.target.value as CurrencyCode)}
                      className="w-full bg-transparent text-sm outline-none"
                    >
                      {CURRENCY_OPTIONS.map((item) => (
                        <option key={item.code} value={item.code} className="text-slate-950">
                          {item.flag} {item.code}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 text-slate-300" />
                  </label>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-2xl font-semibold text-white">{formatAmount(recipientAmount, receiveCurrency)}</div>
                    <p className="mt-1 text-xs text-slate-400">{currentReceiveOption?.label}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-200 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Exchange Rate</p>
                <p className="mt-2 font-medium text-white">
                  1 {sendCurrency} = {exchangeRate.toLocaleString('en-NG', { maximumFractionDigits: 4 })} {receiveCurrency}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Fee (1.5%)</p>
                <p className="mt-2 font-medium text-white">
                  {formatAmount(feeAmount, sendCurrency)} {sendCurrency}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total to recipient</p>
                <p className="mt-2 font-medium text-white">
                  {formatAmount(recipientAmount, receiveCurrency)} {receiveCurrency}
                </p>
              </div>
            </div>

            <Link
              href="/deposit"
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400"
            >
              Fund Wallet with Card
              <SendHorizontal className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
