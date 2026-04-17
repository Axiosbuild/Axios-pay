export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-50">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:68px_68px]" />
      </div>

      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="font-display text-4xl font-bold text-slate-950">Axios Pay</h1>
            <p className="mt-2 text-sm text-slate-600">Cross-border FX, unlocked.</p>
          </div>
          {children}
          <p className="mt-8 text-center text-xs text-slate-500">
            Complaints or support:{' '}
            <a href="mailto:axiosbuild@gmail.com" className="text-emerald-700 hover:underline">
              axiosbuild@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
