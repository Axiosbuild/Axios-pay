'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function VerifyPage() {
  const params = useSearchParams();
  const token = params.get('token');
  const userId = params.get('userId');

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        body: JSON.stringify({ token, otp, userId }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Verification failed');
        return;
      }

      setMessage('Account verified successfully. You can now log in.');
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 border border-border rounded-btn bg-surface">
      <h2 className="text-xl font-semibold text-text-primary mb-4">Verify your account</h2>

      <input
        className="w-full px-3 py-2.5 rounded-btn border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber text-text-primary"
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />

      <button
        className="mt-4 w-full bg-brand-amber text-white rounded-btn py-2.5 disabled:opacity-60"
        onClick={handleVerify}
        disabled={loading}
      >
        {loading ? 'Verifying...' : 'Verify'}
      </button>

      {message ? <p className="mt-4 text-sm text-success">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}
    </div>
  );
}
