'use client';
import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const NATIONALITIES: Record<string, string> = {
  NG: 'Nigeria',
  UG: 'Uganda',
  KE: 'Kenya',
  GH: 'Ghana',
  ZA: 'South Africa',
};

const ID_REQUIREMENTS: Record<string, { label: string; format: string; example: string }> = {
  NG: { label: 'National Identification Number (NIN)', format: '11 digits', example: 'e.g. 71234567890' },
  UG: { label: 'Ndaga Muntu National ID', format: '14 alphanumeric characters', example: 'e.g. CM86000XXXXXX' },
  KE: { label: 'National ID', format: '8 digits', example: 'e.g. 12345678' },
  GH: { label: 'Ghana Card Number', format: 'GHA-XXXXXXXXX-X', example: 'e.g. GHA-123456789-0' },
  ZA: { label: 'South African ID Number', format: '13 digits', example: 'e.g. 9001015009087' },
};

function KYCPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nationality: 'NG',
    idNumber: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
  });

  const kycToken = useMemo(() => {
    const fromQuery = searchParams.get('token');
    if (fromQuery) return fromQuery;
    if (typeof window !== 'undefined') return sessionStorage.getItem('kyc_onboarding_token');
    return null;
  }, [searchParams]);

  const idRequirement = ID_REQUIREMENTS[form.nationality] || ID_REQUIREMENTS.NG;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!form.firstName.trim()) {
        setError('First name is required');
        setLoading(false);
        return;
      }
      if (!form.lastName.trim()) {
        setError('Last name is required');
        setLoading(false);
        return;
      }
      if (!form.idNumber.trim()) {
        setError(`${idRequirement.label} is required`);
        setLoading(false);
        return;
      }
      if (!form.dateOfBirth) {
        setError('Date of birth is required');
        setLoading(false);
        return;
      }

      if (!kycToken) {
        setError('Invalid session. Please start registration again.');
        setLoading(false);
        return;
      }

      // Submit KYC data to backend
      await api.auth.submitKYC({
        onboardingToken: kycToken,
        nationality: form.nationality,
        idNumber: form.idNumber,
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth,
      });

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('kyc_onboarding_token');
      }

      router.push('/login?message=Registration complete! You can now sign in.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      const message = e?.response?.data?.message || e?.response?.data?.error || 'KYC submission failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="font-display text-xl font-semibold text-text-primary mb-2">Complete Your Profile</h2>
      <p className="text-sm text-text-secondary mb-6">Enter your identity information to finish setting up your account.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-error">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nationality selector */}
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 block">Country of Residence</label>
          <select
            value={form.nationality}
            onChange={(e) => setForm({ ...form, nationality: e.target.value })}
            className="w-full px-3 py-2.5 rounded-btn border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-amber"
          >
            {Object.entries(NATIONALITIES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>

        {/* ID Number */}
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 block">{idRequirement.label}</label>
          <p className="text-xs text-text-muted mb-1">Format: {idRequirement.format}</p>
          <input
            type="text"
            value={form.idNumber}
            onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
            placeholder={idRequirement.example}
            className="w-full px-3 py-2.5 rounded-btn border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-amber placeholder-text-muted"
          />
          <p className="text-xs text-text-muted mt-1">Your ID is encrypted and never stored in plain text.</p>
        </div>

        {/* First Name */}
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 block">First Name</label>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            placeholder="Your first name"
            className="w-full px-3 py-2.5 rounded-btn border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-amber placeholder-text-muted"
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 block">Last Name</label>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            placeholder="Your last name"
            className="w-full px-3 py-2.5 rounded-btn border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-amber placeholder-text-muted"
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 block">Date of Birth</label>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            className="w-full px-3 py-2.5 rounded-btn border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-amber"
          />
        </div>

        <Button type="submit" loading={loading} disabled={loading} className="w-full">
          Continue to Login
        </Button>
      </form>

      <p className="text-center text-xs text-text-muted mt-4">
        You can update this information anytime from your profile after signing in.
      </p>
    </Card>
  );
}

export default function KYCPage() {
  return (
    <Suspense fallback={<Card><p className="text-sm text-text-muted">Loading...</p></Card>}>
      <KYCPageContent />
    </Suspense>
  );
}
