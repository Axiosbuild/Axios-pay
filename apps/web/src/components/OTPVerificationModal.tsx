'use client';

import { useState, useEffect } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import { OTPInput } from './ui/OTPInput';
import { Button } from './ui/Button';
import { verifyPaymentOTP } from '@/services/paymentService';

type OTPErrorShape = {
  response?: {
    data?: {
      error?: string;
      remaining?: number;
    };
  };
};

interface OTPVerificationModalProps {
  isOpen: boolean;
  sessionToken: string;
  transactionReference: string;
  expiresInSeconds: number;
  onVerified: (transferToken: string) => void;
  onClose: () => void;
}

export function OTPVerificationModal({
  isOpen,
  sessionToken,
  transactionReference,
  expiresInSeconds,
  onVerified,
  onClose,
}: OTPVerificationModalProps) {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(expiresInSeconds);
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const response = await verifyPaymentOTP({
        sessionToken,
        otp,
        transactionReference,
      });

      if (response.verified) {
        onVerified(response.transferToken);
      }
    } catch (err: unknown) {
      const typedErr = err as OTPErrorShape;
      const errorMsg = typedErr.response?.data?.error || 'Verification failed';
      const remaining = typedErr.response?.data?.remaining;

      setError(errorMsg);
      if (remaining !== undefined) {
        setAttemptsLeft(remaining);
      }

      setOtp('');
    } finally {
      setIsVerifying(false);
    }
  };

  const isExpired = timeLeft <= 0;
  const isDisabled = isVerifying || isExpired || otp.length !== 6;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-card p-8 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-bold text-text-primary">Verify OTP</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-subtle rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-text-secondary" />
          </button>
        </div>

        <p className="text-text-secondary mb-6">
          We&apos;ve sent a 6-digit code to your registered phone number. Enter it below to continue.
        </p>

        <div className="mb-6">
          <OTPInput value={otp} onChange={setOtp} length={6} />
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-btn flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-500">{error}</p>
              {attemptsLeft > 0 && attemptsLeft < 5 && (
                <p className="text-xs text-red-500/70 mt-1">
                  Attempts remaining: {attemptsLeft}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mb-6 flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-text-secondary" />
          <span className={`${isExpired ? 'text-red-500 font-semibold' : 'text-text-secondary'}`}>
            {isExpired ? 'OTP Expired' : `Expires in ${timeLeft}s`}
          </span>
        </div>

        <Button
          onClick={handleVerify}
          disabled={isDisabled}
          loading={isVerifying}
          className="w-full"
        >
          Verify OTP
        </Button>

        <p className="text-xs text-text-muted text-center mt-4">
          Didn&apos;t receive the code? It may take up to 30 seconds. Check your spam folder.
        </p>
      </div>
    </div>
  );
}
