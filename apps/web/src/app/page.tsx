import Link from 'next/link';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { LiveFxTicker } from '@/components/landing/LiveFxTicker';
import { HowItWorksBento } from '@/components/landing/HowItWorksBento';
import { CorridorTable } from '@/components/landing/CorridorTable';
import { TrustBanner } from '@/components/landing/TrustBanner';
import { FooterCta } from '@/components/landing/FooterCta';
import { SectionReveal } from '@/components/landing/SectionReveal';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_28%)]" />
      <LandingHeader />
      <HeroSection />

      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionReveal>
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-600">Live FX Ticker</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Markets moving in real time.
                </h2>
              </div>
            </div>
            <LiveFxTicker />
          </div>
        </SectionReveal>

        <SectionReveal>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-600">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              A clean four-step flow for modern travelers.
            </h2>
            <div className="mt-6">
              <HowItWorksBento />
            </div>
          </div>
        </SectionReveal>

        <SectionReveal id="rates">
          <CorridorTable />
        </SectionReveal>

        <SectionReveal>
          <TrustBanner />
        </SectionReveal>

        <SectionReveal>
          <FooterCta />
        </SectionReveal>
      </div>

      <div className="pb-12" />
      <div className="mx-auto max-w-7xl px-4 pb-8 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
        <Link href="/deposit" className="transition hover:text-slate-700">
          Need to fund your wallet? Visit Deposit.
        </Link>
      </div>
    </main>
  );
}
