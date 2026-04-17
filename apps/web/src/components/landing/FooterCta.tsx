import Link from 'next/link';

export function FooterCta() {
  return (
    <section className="rounded-[2rem] bg-white px-6 py-10 shadow-sm ring-1 ring-slate-200 sm:px-8 lg:px-10 lg:py-12">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Ready to swap smarter?</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Join travelers who never overpay for currency exchange.
          </h2>
        </div>

        <Link
          href="/register"
          className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Create Free Account
        </Link>
      </div>

      <footer className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Axios Pay. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/login" className="transition hover:text-slate-950">
            Log in
          </Link>
          <Link href="/register" className="transition hover:text-slate-950">
            Open Account
          </Link>
          <a href="mailto:axiosbuild@gmail.com" className="transition hover:text-slate-950">
            Support
          </a>
        </div>
      </footer>
    </section>
  );
}
