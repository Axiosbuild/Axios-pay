import { CreditCard, Plane, RefreshCw, Smartphone } from 'lucide-react';
import { HOW_IT_WORKS_STEPS } from './landing-data';

const iconMap = {
  CreditCard,
  RefreshCw,
  Plane,
  Smartphone,
} as const;

export function HowItWorksBento() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {HOW_IT_WORKS_STEPS.map((step, index) => {
        const Icon = iconMap[step.icon];
        const gradient =
          index === 0
            ? 'from-emerald-50 to-white'
            : index === 1
              ? 'from-sky-50 to-white'
              : index === 2
                ? 'from-cyan-50 to-white'
                : 'from-slate-100 to-white';

        return (
          <article
            key={step.title}
            className={`group rounded-[1.75rem] border border-slate-200 bg-gradient-to-br ${gradient} p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15 transition group-hover:bg-emerald-400 group-hover:text-slate-950">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Step 0{index + 1}
              </span>
            </div>
            <h3 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">{step.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
          </article>
        );
      })}
    </div>
  );
}
