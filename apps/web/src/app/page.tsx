import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(200,119,42,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(26,35,50,0.14),_transparent_26%),linear-gradient(180deg,_#fffaf3_0%,_#f9f7f4_48%,_#f3eee6_100%)]">
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(26,35,50,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(26,35,50,0.04)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:grid lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:px-8">
        <section className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-amber/20 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand-amber shadow-sm backdrop-blur">
            Cross-border finance for African markets
          </p>
          <h1 className="mt-6 max-w-xl font-display text-4xl font-bold leading-[0.95] text-text-primary sm:text-5xl xl:text-6xl">
            A cleaner home page for Axios Pay, with the wallet funding flow kept in its own route.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg sm:leading-8">
            The landing page now carries the brand, visuals, and entry points. Wallet deposit and funding screens should
            live on their own page so desktop users do not land directly inside a phone-style checkout shell.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-btn bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-medium"
            >
              Log in
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center justify-center rounded-btn border border-border bg-white px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-subtle"
            >
              Create account
            </Link>
            <Link
              href="/fund-wallet"
              className="inline-flex min-h-11 items-center justify-center rounded-btn border border-brand-amber/30 bg-brand-bg px-5 py-3 text-sm font-semibold text-brand-amber transition hover:bg-brand-bg/80"
            >
              Fund wallet
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Supported currencies', value: '5' },
              { label: 'Live FX visibility', value: '24/7' },
              { label: 'Secure rails', value: 'Interswitch' },
            ].map((item) => (
              <div key={item.label} className="rounded-card border border-border bg-white/85 p-4 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-text-muted">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Wallet,
                title: 'Clear wallet overview',
                description: 'Balances, funding, and transactions are easier to scan when they are not squeezed into a mobile frame.',
              },
              {
                icon: ShieldCheck,
                title: 'Safer onboarding',
                description: 'Login, registration, KYC, and security controls remain available without crowding the homepage.',
              },
              {
                icon: TrendingUp,
                title: 'Live corridor rates',
                description: 'The homepage can highlight product value instead of acting like an embedded deposit form.',
              },
              {
                icon: CheckCircle2,
                title: 'Separate funding route',
                description: 'Wallet deposit now belongs on /fund-wallet or the dashboard funding page, not the landing page.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-card border border-border bg-white/85 p-5 shadow-sm backdrop-blur">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-bg text-brand-amber">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 font-semibold text-text-primary">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-10 lg:mt-0 lg:flex lg:items-center lg:justify-end">
          <div className="w-full max-w-[560px] rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_rgba(26,35,50,0.12)] backdrop-blur-xl">
            <div className="overflow-hidden rounded-[1.5rem] bg-navy p-6 text-white">
              <div className="flex items-center justify-between text-sm text-white/70">
                <span>Axios Pay</span>
                <span>Homepage preview</span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/55">Wallet balance</p>
                  <p className="mt-3 text-3xl font-semibold">NGN 248,540.00</p>
                  <p className="mt-2 text-sm text-white/70">Shown as a product preview, not the homepage itself</p>
                </div>
                <div className="rounded-2xl bg-brand-amber/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">Fast actions</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="rounded-xl bg-white/10 px-3 py-2">Fund wallet</div>
                    <div className="rounded-xl bg-white/10 px-3 py-2">Swap currency</div>
                    <div className="rounded-xl bg-white/10 px-3 py-2">Send transfer</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {['NGN', 'UGX', 'KES'].map((currency) => (
                  <div key={currency} className="rounded-2xl bg-white/10 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/55">{currency}</p>
                    <p className="mt-2 text-lg font-semibold">Live rate</p>
                    <p className="mt-1 text-sm text-white/70">Updated now</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-brand-bg p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-brand-amber">Visuals</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">The homepage now has background texture and a clearer editorial layout.</p>
              </div>
              <div className="rounded-2xl border border-border bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Routing</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">Use the funding page for deposits and keep the landing page focused on navigation.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
