'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function CallbackContent() {
  const searchParams = useSearchParams();
  const resp = searchParams.get('resp');
  const isSuccess = resp === '00';

  const title = isSuccess
    ? 'Payment successful! Your wallet is being credited.'
    : 'Payment is being processed. Your wallet will be credited shortly.';

  const messageClass = isSuccess
    ? 'bg-green-50 border-green-200 text-green-800'
    : 'bg-amber-50 border-amber-200 text-amber-800';

  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className={`border rounded-btn px-4 py-3 text-sm font-medium mb-6 ${messageClass}`}>
        {title}
      </div>
      <Link
        href="/dashboard"
        className="inline-flex bg-brand-amber text-white px-6 py-2.5 rounded-btn font-medium hover:bg-brand-gold transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}

export default function DepositCallbackPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16 text-text-muted text-sm">Loading payment status...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
