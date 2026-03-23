'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { apiClient } from '../lib/api-client';

const CORRIDORS = [
  { from: 'NGN', to: 'UGX', fromFlag: '🇳🇬', toFlag: '🇺🇬' },
  { from: 'KES', to: 'GHS', fromFlag: '🇰🇪', toFlag: '🇬🇭' },
  { from: 'ZAR', to: 'NGN', fromFlag: '🇿🇦', toFlag: '🇳🇬' },
  { from: 'GHS', to: 'KES', fromFlag: '🇬🇭', toFlag: '🇰🇪' },
  { from: 'NGN', to: 'KES', fromFlag: '🇳🇬', toFlag: '🇰🇪' },
  { from: 'UGX', to: 'TZS', fromFlag: '🇺🇬', toFlag: '🇹🇿' },
];

interface RateData {
  baseCurrency: string;
  quoteCurrency: string;
  mid: number;
  ask: number;
  bid: number;
}

export default function LandingPage() {
  const [rates, setRates] = useState<RateData[]>([]);
  const heroRef = useRef(null);
  const howRef = useRef(null);
  const howInView = useInView(howRef, { once: true, margin: '-100px' });

  useEffect(() => {
    apiClient.get('/fx/rates').then((r) => setRates(r.data.rates)).catch(() => {});
    const interval = setInterval(() => {
      apiClient.get('/fx/rates').then((r) => setRates(r.data.rates)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getRate = (from: string, to: string) =>
    rates.find((r) => r.baseCurrency === from && r.quoteCurrency === to);

  return (
    <div className="min-h-screen bg-green-900 text-neutral-50 overflow-x-hidden">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4" style={{ background: 'rgba(10,35,24,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="font-display text-2xl font-bold text-gold-400">Axios<span className="text-white">Pay</span></span>
          <div className="hidden md:flex items-center gap-8 text-sm text-neutral-300">
            <a href="#how" className="hover:text-white transition-colors">How It Works</a>
            <a href="#rates" className="hover:text-white transition-colors">Live Rates</a>
            <a href="#trust" className="hover:text-white transition-colors">Security</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-neutral-300 hover:text-white transition-colors px-4 py-2">Sign In</Link>
            <Link href="/auth/register" className="text-sm font-semibold bg-green-400 text-white px-5 py-2.5 rounded-lg hover:bg-green-300 transition-colors">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20">
        {/* Animated African continent SVG background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-[700px] h-[700px] opacity-10" viewBox="0 0 400 400" fill="none">
            <path d="M180,20 C200,18 220,22 235,30 C255,40 265,55 270,70 C275,85 272,100 280,115 C290,133 305,140 310,158 C316,178 308,195 305,212 C302,228 305,244 300,260 C294,278 280,290 268,305 C254,322 242,338 225,350 C205,363 182,368 162,362 C142,356 128,340 115,325 C100,308 88,290 82,270 C76,250 78,228 80,208 C82,188 84,168 78,148 C72,128 58,112 60,92 C62,72 80,58 95,45 C112,30 140,22 160,20 Z" stroke="#2D9E6B" strokeWidth="1.5" fill="none" className="animate-pulse-slow" />
            {/* Corridor pulse dots */}
            <circle cx="210" cy="105" r="4" fill="#F0A832" className="animate-pulse" /> {/* Lagos */}
            <circle cx="230" cy="145" r="4" fill="#F0A832" className="animate-pulse delay-200" /> {/* Kampala */}
            <circle cx="235" cy="130" r="4" fill="#F0A832" className="animate-pulse delay-100" /> {/* Nairobi */}
            <circle cx="200" cy="100" r="4" fill="#F0A832" className="animate-pulse delay-300" /> {/* Accra */}
            <circle cx="205" cy="270" r="4" fill="#F0A832" className="animate-pulse delay-400" /> {/* Joburg */}
            {/* Corridor lines */}
            <line x1="210" y1="105" x2="230" y2="145" stroke="#F0A832" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
            <line x1="200" y1="100" x2="235" y2="130" stroke="#F0A832" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
            <line x1="230" y1="145" x2="240" y2="160" stroke="#F0A832" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
          </svg>
          {/* Gradient mesh */}
          <div className="absolute top-0 left-0 w-full h-full" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(45,158,107,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(240,168,50,0.06) 0%, transparent 50%)' }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-24 relative z-10">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-green-800/60 border border-green-600/30 rounded-full px-4 py-1.5 text-sm text-green-200 mb-8"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live across 12 African currencies
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display text-7xl md:text-8xl font-bold leading-[0.9] tracking-tight mb-8 text-balance"
            >
              Your Money.<br />
              <span className="text-gold-400">Every Border.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl text-neutral-300 mb-10 max-w-xl leading-relaxed"
            >
              Deposit your local currency. Swap at live rates. Withdraw on arrival — anywhere in Africa, instantly.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <Link href="/auth/register" className="font-semibold bg-gold-400 text-green-900 px-8 py-4 rounded-lg hover:bg-gold-300 transition-all hover:scale-105 text-lg shadow-lg shadow-gold-400/20">
                Start for Free
              </Link>
              <Link href="#how" className="flex items-center gap-2 text-neutral-300 hover:text-white transition-colors group">
                See how it works
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center gap-6 mt-12 pt-8 border-t border-white/10"
            >
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-white">10K+</div>
                <div className="text-sm text-neutral-400 mt-1">Travelers</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-white">12</div>
                <div className="text-sm text-neutral-400 mt-1">Currencies</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-white">~30s</div>
                <div className="text-sm text-neutral-400 mt-1">Avg. swap</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-gold-400">0.8%</div>
                <div className="text-sm text-neutral-400 mt-1">From fee</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live rate ticker */}
      <div className="relative overflow-hidden py-4 border-y border-white/8" style={{ background: 'rgba(15,53,36,0.6)' }}>
        <div className="flex animate-ticker whitespace-nowrap">
          {[...CORRIDORS, ...CORRIDORS].map((c, i) => {
            const rate = getRate(c.from, c.to);
            return (
              <div key={i} className="inline-flex items-center gap-3 px-8 text-sm">
                <span>{c.fromFlag} {c.from}</span>
                <span className="text-neutral-500">→</span>
                <span>{c.toFlag} {c.to}</span>
                <span className="font-mono font-medium text-gold-400">
                  {rate ? rate.mid.toFixed(4) : '—'}
                </span>
                <span className="text-neutral-600">|</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* How it works */}
      <section id="how" ref={howRef} className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={howInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="font-display text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-neutral-400 text-lg">Three steps. Seconds to complete.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: '⬆', title: 'Deposit', desc: 'Fund your wallet with your local currency via bank transfer, card, or mobile money.', color: 'from-green-800 to-green-700' },
              { step: '02', icon: '⇄', title: 'Swap at Live Rates', desc: 'Lock in a real-time exchange rate. We apply our transparent fee — as low as 0.8%.', color: 'from-green-700 to-green-600' },
              { step: '03', icon: '⬇', title: 'Withdraw on Arrival', desc: 'Withdraw your destination currency directly to any bank account or mobile wallet.', color: 'from-green-600 to-green-500' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={howInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className={`relative p-8 rounded-2xl bg-gradient-to-br ${item.color} border border-white/8 overflow-hidden group hover:scale-[1.02] transition-transform`}
              >
                <div className="font-mono text-6xl font-bold text-white/10 absolute top-4 right-6">{item.step}</div>
                <div className="text-4xl mb-6">{item.icon}</div>
                <h3 className="font-display text-2xl font-bold mb-3">{item.title}</h3>
                <p className="text-green-100/80 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live rates */}
      <section id="rates" className="py-24 px-6" style={{ background: 'rgba(15,53,36,0.4)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-display text-4xl font-bold mb-2">Live Exchange Rates</h2>
              <p className="text-neutral-400 text-sm">Updated every 60 seconds</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {CORRIDORS.map((c, i) => {
              const rate = getRate(c.from, c.to);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 rounded-2xl glass border border-white/8 hover:border-green-600/40 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-sm text-neutral-300">
                      <span>{c.fromFlag}</span>
                      <span>{c.from}</span>
                      <span className="text-neutral-600">→</span>
                      <span>{c.toFlag}</span>
                      <span>{c.to}</span>
                    </div>
                  </div>
                  <div className="font-mono text-xl font-bold text-white">
                    {rate ? rate.mid.toFixed(4) : <span className="skeleton w-20 h-5 block" />}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">mid rate</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🔒', title: 'Bank-grade Security', desc: 'AES-256 encryption, HMAC-signed transactions, and biometric KYC verification.' },
              { icon: '⚡', title: 'Instant Settlements', desc: 'Powered by Interswitch\'s pan-African payment network with real-time confirmation.' },
              { icon: '🌍', title: 'Pan-African Reach', desc: 'Starting with 12 currencies across 8 countries. Expanding to all 54 African nations.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-2xl border border-white/8 bg-green-800/30"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-display text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-neutral-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-6xl font-bold mb-6 text-balance">Move money like borders don't exist.</h2>
          <p className="text-neutral-400 text-lg mb-10">Join thousands of African travelers already using Axios Pay.</p>
          <Link href="/auth/register" className="inline-block font-semibold bg-gold-400 text-green-900 px-10 py-5 rounded-lg hover:bg-gold-300 transition-all hover:scale-105 text-lg shadow-xl shadow-gold-400/20">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 py-12 px-6" style={{ background: 'rgba(10,35,24,0.8)' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <span className="font-display text-xl font-bold text-gold-400">Axios<span className="text-white">Pay</span></span>
          <div className="flex items-center gap-8 text-sm text-neutral-400">
            <Link href="/legal/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/legal/aml" className="hover:text-white transition-colors">AML Policy</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
          </div>
          <p className="text-sm text-neutral-500">© {new Date().getFullYear()} Axios Pay</p>
        </div>
      </footer>
    </div>
  );
}
