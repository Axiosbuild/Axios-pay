'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';

function CallbackContent() {
  const [state, setState] = useState<'processing' | 'success'>('processing');
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');

  useEffect(() => {
    const timer = setTimeout(() => setState('success'), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-md mx-auto text-center py-16">
      {state === 'processing' ? (
        <>
          <div className="flex justify-center mb-4"><Spinner size="lg" /></div>
          <h2 className="font-display text-xl font-semibold text-text-primary mb-2">Processing payment...</h2>
          <p className="text-text-muted text-sm">Please wait while we confirm your transaction.</p>
          {ref && <p className="text-xs text-text-muted mt-2 font-mono">Ref: {ref}</p>}
        </>
      ) : (
        <>
          <div className="text-5xl mb-4">✅</div>
          <h2 className="font-display text-xl font-semibold text-text-primary mb-2">Payment received!</h2>
          <p className="text-text-muted text-sm mb-6">Your wallet will be credited once the payment is confirmed by Interswitch. This usually takes a few seconds.</p>
          <Link href="/dashboard">
            <button className="bg-brand-amber text-white px-6 py-2.5 rounded-btn font-medium hover:bg-brand-gold transition-colors">
              Back to Dashboard
            </button>
          </Link>
        </>
      )}
    </div>
  );
}

export default function DepositCallbackPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner size="lg" /></div>}>
      <CallbackContent />
    </Suspense>
  );
}
