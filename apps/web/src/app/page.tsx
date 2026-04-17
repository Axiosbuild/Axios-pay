'use client';

import Link from 'next/link';
import { ArrowRight, Send, Zap, Lock } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-page overflow-hidden">
      {/* Subtle background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient accent top-left */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-brand-amber/5 rounded-full blur-3xl" />
        {/* Gradient accent bottom-right */}
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-navy/5 rounded-full blur-3xl" />
        {/* Subtle grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Header navigation */}
        <header className="mb-16 sm:mb-24">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-text-primary">Axios Pay</h2>
              <p className="text-xs sm:text-sm text-text-muted mt-1">Cross-border FX, unlocked.</p>
            </div>
            <nav className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-text-primary hover:text-brand-amber transition"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-10 items-center justify-center rounded-btn border border-text-primary px-4 text-sm font-semibold text-text-primary hover:bg-subtle transition"
              >
                Sign up
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight mb-6">
              Send money across Africa at mid-market rates.
            </h1>
            <p className="text-lg text-text-secondary mb-8 leading-relaxed">
              Swap currencies, fund wallets, and send transfers across our supported corridors without the middleman fees.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-flex min-h-12 items-center justify-center rounded-btn bg-navy text-white font-semibold px-6 hover:bg-navy-medium transition"
              >
                Get started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link
                href="/fund-wallet"
                className="inline-flex min-h-12 items-center justify-center rounded-btn border border-border bg-white text-text-primary font-semibold px-6 hover:bg-subtle transition"
              >
                Fund wallet
              </Link>
            </div>
          </div>

          {/* Product showcase card */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="w-full max-w-sm">
              <div className="bg-navy rounded-2xl p-8 text-white shadow-lg">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-sm text-white/60">NGN Wallet</p>
                    <p className="text-3xl font-semibold mt-2">₦248,540</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-brand-amber/20 flex items-center justify-center">
                    <span className="text-2xl">🇳🇬</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8 pt-8 border-t border-white/10">
                  {[
                    { icon: '→', label: 'Send', value: 'Instant' },
                    { icon: '↔', label: 'Swap', value: 'Live rates' },
                    { icon: '💳', label: 'Fund', value: 'Secure' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="text-white/70">{item.label}</span>
                      <span className="text-white/90 font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>

                <button className="w-full bg-brand-amber text-white rounded-btn py-3 font-semibold hover:bg-brand-gold transition">
                  Send money
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Features section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-12">
          {[
            {
              icon: Zap,
              title: 'Live exchange rates',
              description: 'No hidden markups. Track rates in real-time across all corridors.',
            },
            {
              icon: Send,
              title: 'Instant transfers',
              description: 'Send money to local banks within minutes, not hours or days.',
            },
            {
              icon: Lock,
              title: 'Bank-grade security',
              description: 'PIN protection, 2FA, and KYC verification on every account.',
            },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="p-6 rounded-lg border border-border bg-white/50 backdrop-blur">
                <div className="w-10 h-10 rounded-lg bg-brand-bg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-brand-amber" />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">{feature.title}</h3>
                <p className="text-sm text-text-secondary">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Stats section */}
        <div className="border-t border-border pt-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {[
              { label: 'Corridors', value: '5' },
              { label: 'Countries', value: 'NG, UG, KE, GH, ZA' },
              { label: 'Settlement', value: 'T+0 to T+2' },
              { label: 'Security', value: 'USSD + Cards' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-xs uppercase tracking-wide text-text-muted mb-2">{stat.label}</p>
                <p className="text-lg sm:text-xl font-semibold text-text-primary">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border mt-16 pt-8 text-center text-sm text-text-muted">
          <p>
            Complaints or support:{' '}
            <a href="mailto:axiosbuild@gmail.com" className="text-brand-amber hover:underline">
              axiosbuild@gmail.com
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
