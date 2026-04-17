'use client';
import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function TermsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const userId = useMemo(() => {
    const fromQuery = searchParams.get('userId');
    if (fromQuery) return fromQuery;
    if (typeof window !== 'undefined') return sessionStorage.getItem('terms_user_id');
    return null;
  }, [searchParams]);

  async function handleContinue() {
    if (!userId || !accepted) return;
    setLoading(true);
    setError('');
    try {
      await api.auth.acceptTerms({ userId, accepted: true });
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('terms_user_id');
      }
      router.push('/login?message=Terms accepted. You can now sign in.');
    } catch {
      setError('Unable to record acceptance. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="font-display text-xl font-semibold text-text-primary mb-4">Terms and Conditions</h2>

      <div className="space-y-3 text-sm text-text-secondary max-h-72 overflow-y-auto pr-1">
        <p>
          Welcome to Axios Pay. By continuing, you acknowledge that this is a regulated cross-border payment platform
          and that you are responsible for accurate identity information and lawful use of the service.
        </p>
        <p>
          You agree to comply with applicable anti-fraud, anti-money laundering, and sanctions requirements. We may
          request additional documents to maintain compliance and platform safety.
        </p>
        <p>
          Exchange rates, fees, transfer timelines, and transaction limits may vary based on market conditions,
          jurisdiction, and your account profile. You are responsible for reviewing transaction details before
          confirming any operation.
        </p>
      </div>

      <label className="mt-5 flex items-start gap-3 text-sm text-text-primary">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>I have read and agree to the Terms and Conditions</span>
      </label>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-error">{error}</div>
      )}

      <Button
        className="w-full mt-5"
        onClick={handleContinue}
        disabled={!accepted || !userId}
        loading={loading}
      >
        Continue
      </Button>
    </Card>
  );
}

export default function TermsPage() {
  return (
    <Suspense fallback={<Card><p className="text-sm text-text-muted">Loading...</p></Card>}>
      <TermsPageContent />
    </Suspense>
  );
}
