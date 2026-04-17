export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page overflow-hidden">
      {/* Subtle background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-brand-amber/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-navy/5 rounded-full blur-3xl" />
      </div>

      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="font-display text-4xl font-bold text-text-primary">Axios Pay</h1>
            <p className="text-text-secondary text-sm mt-2">Cross-border FX, unlocked.</p>
          </div>
          {children}
          <p className="text-center text-xs text-text-muted mt-8">
            Complaints or support:{' '}
            <a href="mailto:axiosbuild@gmail.com" className="text-brand-amber hover:underline">
              axiosbuild@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
