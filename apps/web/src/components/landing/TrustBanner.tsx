export function TrustBanner() {
  const metrics = [
    { label: '5 Currencies', value: 'NGN, UGX, KES, GHS, ZAR' },
    { label: '1.5% Flat Fee', value: 'No hidden charges, ever' },
    { label: 'Instant Settlement', value: 'Swap completes in seconds' },
  ];

  return (
    <section className="rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-[0_30px_80px_rgba(2,6,23,0.25)] sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-300/80">Why Axios Pay</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Built for the way African users move money across borders.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{metric.label}</p>
              <p className="mt-2 text-lg font-semibold text-white">{metric.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
