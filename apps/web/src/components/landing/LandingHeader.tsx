import Link from 'next/link';
import { ArrowUpRight, Mountain } from 'lucide-react';

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-slate-950/55 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg shadow-cyan-950/30">
            <Mountain className="h-5 w-5 text-emerald-300" />
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-tight sm:text-xl">Axios Pay</span>
            <span className="block text-xs text-slate-300">Cross-border FX, unlocked.</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-400 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300"
          >
            Open Account
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
