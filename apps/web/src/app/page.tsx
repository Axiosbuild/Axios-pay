import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { RatesTicker } from '@/components/ui/RatesTicker';
import { ArrowRight, Globe, TrendingUp, Zap } from 'lucide-react';

export default function LandingPage() {
  const corridors = [
    { from: '🇳🇬 NGN', to: '🇺🇬 UGX', rate: '10.85' },
    { from: '🇳🇬 NGN', to: '🇰🇪 KES', rate: '0.29' },
    { from: '🇳🇬 NGN', to: '🇬🇭 GHS', rate: '0.021' },
    { from: '🇳🇬 NGN', to: '🇿🇦 ZAR', rate: '0.052' },
    { from: '🇺🇬 UGX', to: '🇰🇪 KES', rate: '0.027' },
    { from: '🇰🇪 KES', to: '🇬🇭 GHS', rate: '0.072' },
  ];

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      {/* Hero */}
      <section className="bg-navy min-h-screen flex items-center pt-20">
        <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-sm text-white/80">Live rates updated every 2 hours</span>
            </div>
            <h1 className="font-display text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Cross-Border FX,{' '}
              <span className="text-brand-amber">Unlocked.</span>
            </h1>
            <p className="text-lg text-white/70 mb-8 leading-relaxed">
              Flying from Lagos to Nairobi? Swap your Naira for Shillings before you land.
              Mid-market rates, 1.5% flat fee, instant settlement.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/register">
                <button className="bg-brand-amber text-white px-6 py-3 rounded-btn font-semibold hover:bg-brand-gold transition-colors flex items-center gap-2">
                  Open Account <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="#rates">
                <button className="border border-white/30 text-white px-6 py-3 rounded-btn font-semibold hover:bg-white/10 transition-colors">
                  View Rates
                </button>
              </Link>
            </div>
          </div>

          {/* Swap preview card */}
          <div className="bg-surface rounded-card p-6 shadow-2xl">
            <h3 className="font-display text-lg font-semibold text-text-primary mb-4">Quick Swap</h3>
            <div className="space-y-3">
              <div className="bg-subtle rounded-btn p-4">
                <p className="text-xs text-text-muted mb-1">You send</p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">🇳🇬 NGN</span>
                  <span className="font-mono text-2xl text-text-primary">10,000</span>
                </div>
              </div>
              <div className="text-center text-text-muted text-sm">↕ 1 NGN = 10.85 UGX</div>
              <div className="bg-brand-bg rounded-btn p-4 border border-brand-amber/30">
                <p className="text-xs text-text-muted mb-1">You receive</p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">🇺🇬 UGX</span>
                  <span className="font-mono text-2xl text-text-primary">106,882</span>
                </div>
              </div>
              <div className="bg-subtle rounded-btn p-3 text-sm text-text-secondary flex justify-between">
                <span>Fee (1.5%)</span>
                <span className="font-mono">150 NGN</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rates ticker */}
      <section id="rates" className="bg-navy-medium py-4 overflow-hidden">
        <RatesTicker />
      </section>

      {/* How it works */}
      <section className="py-20 bg-page">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-text-primary mb-4">How It Works</h2>
            <p className="text-text-secondary">Four simple steps to swap your currency</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', icon: '💳', title: 'Deposit', desc: 'Fund your wallet with your local currency via secure payment' },
              { step: '02', icon: '💱', title: 'Swap', desc: 'Select destination currency, see live rate and transparent fee' },
              { step: '03', icon: '✈️', title: 'Travel', desc: 'Hop on your flight with destination currency ready in your app' },
              { step: '04', icon: '💸', title: 'Spend', desc: 'Use your destination wallet when you land — no kiosk queues' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="bg-surface rounded-card border border-border p-6 text-center">
                <div className="text-4xl mb-3">{icon}</div>
                <div className="text-xs font-mono text-brand-amber mb-2">{step}</div>
                <h3 className="font-semibold text-text-primary mb-2">{title}</h3>
                <p className="text-sm text-text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Corridors */}
      <section className="py-20 bg-subtle">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-text-primary mb-4">Supported Corridors</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {corridors.map(({ from, to, rate }) => (
              <div key={`${from}-${to}`} className="bg-surface rounded-card border border-border p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-text-primary">{from} → {to}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 bg-success rounded-full" />
                    <span className="text-xs text-success">Live</span>
                  </div>
                </div>
                <p className="font-mono text-lg font-semibold text-brand-amber">{rate}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust stats */}
      <section className="py-20 bg-page">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              { icon: <Globe className="w-8 h-8" />, stat: '5 Currencies', desc: 'NGN, UGX, KES, GHS, ZAR' },
              { icon: <TrendingUp className="w-8 h-8" />, stat: '1.5% Flat Fee', desc: 'No hidden charges, ever' },
              { icon: <Zap className="w-8 h-8" />, stat: 'Instant Settlement', desc: 'Swap completes in seconds' },
            ].map(({ icon, stat, desc }) => (
              <div key={stat} className="flex flex-col items-center gap-3">
                <div className="text-brand-amber">{icon}</div>
                <p className="font-display text-2xl font-bold text-text-primary">{stat}</p>
                <p className="text-text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-brand-amber py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">Ready to swap smarter?</h2>
          <p className="text-white/90 mb-8">Join travelers who never overpay for currency exchange.</p>
          <Link href="/register">
            <button className="bg-navy text-white px-8 py-3 rounded-btn font-semibold hover:bg-navy-medium transition-colors">
              Create Free Account
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div>
            <p className="font-display font-bold text-white">Axios Pay</p>
            <p className="text-sm text-white/50">Cross-Border FX, Unlocked.</p>
          </div>
          <p className="text-sm text-white/50">© {new Date().getFullYear()} Axios Pay. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
