'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const API = process.env.NEXT_PUBLIC_API_URL;

type VerifyStatus = 'verifying' | 'success' | 'failed';

interface VerifyDetails {
  status?: string;
  amount?: number;
  currency?: string;
}

export default function FundCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const reference = params.get('ref');
  const [status, setStatus] = useState<VerifyStatus>('verifying');
  const [details, setDetails] = useState<VerifyDetails | null>(null);

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      return;
    }

    fetch(`${API}/api/funding/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference }),
    })
      .then((response) => response.json())
      .then((data: VerifyDetails) => {
        setDetails(data);
        setStatus(data.status === 'SUCCESS' ? 'success' : 'failed');
      })
      .catch(() => {
        setStatus('failed');
      });
  }, [reference]);

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <Card>
        {status === 'verifying' ? (
          <div className="text-center py-8">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Confirming your payment...</p>
          </div>
        ) : null}

        {status === 'success' ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Wallet Funded!</h2>
            <p className="text-gray-600 mb-6">
              <strong>{details?.currency} {details?.amount?.toLocaleString()}</strong> has been added to your wallet.
            </p>
            <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
          </div>
        ) : null}

        {status === 'failed' ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-500 mb-6">Your wallet was not funded. No money was charged.</p>
            <Button variant="secondary" onClick={() => router.push('/wallet/fund')}>Try Again</Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
