'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type Rate = { baseCurrency: string; quoteCurrency: string; mid: number };

const CORRIDORS = [
  ['NGN', 'UGX'],
  ['KES', 'GHS'],
  ['ZAR', 'NGN'],
  ['GHS', 'KES'],
  ['NGN', 'KES'],
];

export default function LandingPage() {
  const [rates, setRates] = useState<Rate[]>([]);

  useEffect(() => {
    let active = true;

    const loadRates = async () => {
      try {
        const res = await apiClient.get('/fx/rates');
        if (active) setRates(res.data.rates || []);
      } catch {
        if (active) setRates([]);
      }
    };

    loadRates();
    const timer = setInterval(loadRates, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const getRate = (from: string, to: string) => rates.find((r) => r.baseCurrency === from && r.quoteCurrency === to)?.mid;

  return (
    <main className="min-h-screen bg-green-900 text-white">
      <nav className="sticky top-0 z-20 border-b border-white/10 bg-[#0A2318dd] backdrop-blur px-6 py-4 flex justify-between items-center">
        <h1 className="font-display text-2xl text-gold-400">Axios Pay</h1>
        <div className="flex gap-3">
          <Link href="/auth/login" className="px-4 py-2 border border-white/20 rounded">Sign in</Link>
          <Link href="/auth/register" className="px-4 py-2 bg-green-400 text-green-900 rounded font-semibold">Get started</Link>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-display text-6xl leading-[0.95]">Your Money.<br /><span className="text-gold-400">Every Border.</span></h2>
            <p className="mt-5 text-white/75 text-lg">Dark pan-African luxury fintech designed for fast cross-border swaps and wallet transfers.</p>
            <div className="mt-8 flex gap-3">
              <Link href="/auth/register" className="px-6 py-3 rounded-lg bg-gold-400 text-green-900 font-semibold">Open account</Link>
              <Link href="/dashboard" className="px-6 py-3 rounded-lg border border-white/20">View dashboard</Link>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <svg viewBox="0 0 420 420" className="w-full h-[320px]">
              <path d="M188,24 C210,22 232,26 250,34 C272,44 282,62 288,79 C294,96 292,114 301,130 C312,150 327,158 334,178 C342,201 332,220 328,240 C324,258 327,276 320,294 C312,316 296,330 282,347 C266,366 252,383 232,396 C210,411 185,416 164,409 C143,402 128,385 113,369 C96,350 83,330 76,307 C68,284 70,260 73,239 C76,218 78,197 71,177 C64,156 49,139 51,118 C53,97 72,82 89,68 C108,51 138,31 166,26 Z" stroke="#2D9E6B" fill="none" strokeWidth="2" />
              <circle cx="220" cy="112" r="5" fill="#F0A832"><animate attributeName="r" values="4;7;4" dur="1.8s" repeatCount="indefinite" /></circle>
              <circle cx="242" cy="152" r="5" fill="#F0A832"><animate attributeName="r" values="4;7;4" dur="1.8s" begin="0.3s" repeatCount="indefinite" /></circle>
              <circle cx="206" cy="109" r="5" fill="#F0A832"><animate attributeName="r" values="4;7;4" dur="1.8s" begin="0.6s" repeatCount="indefinite" /></circle>
              <line x1="220" y1="112" x2="242" y2="152" stroke="#F0A832" strokeDasharray="4 4" />
              <line x1="206" y1="109" x2="242" y2="152" stroke="#F0A832" strokeDasharray="4 4" />
            </svg>
          </div>
        </div>
      </section>

      <section className="overflow-hidden border-y border-white/10 py-3">
        <div className="inline-flex animate-ticker whitespace-nowrap">
          {[...CORRIDORS, ...CORRIDORS].map(([from, to], i) => (
            <div key={`${from}-${to}-${i}`} className="inline-flex gap-2 px-6 text-sm">
              <span>{from}</span><span>→</span><span>{to}</span>
              <span className="amount text-gold-400">{getRate(from, to)?.toFixed(4) ?? '—'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-5">
        {[
          ['Deposit', 'Fund local wallet through bank transfer, card, or mobile money.'],
          ['Swap', 'Lock in live quote and convert in seconds.'],
          ['Withdraw', 'Payout to destination bank or wallet.'],
        ].map(([title, text]) => (
          <article key={title} className="glass rounded-2xl p-6">
            <h3 className="font-display text-2xl text-gold-400">{title}</h3>
            <p className="mt-2 text-white/75">{text}</p>
          </article>
        ))}
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-4">
          {['Bank-grade encryption', 'Pan-African corridors', 'Regulatory-first KYC'].map((item) => (
            <div key={item} className="glass rounded-xl p-4 text-center text-white/80">{item}</div>
          ))}
        </div>
      </section>
    </main>
  );
}
