'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { OTPInput } from '@/components/ui/OTPInput';
import { useAuthStore } from '@/store/authStore';
import {
  requestPaymentOTP,
  resendPaymentOTP,
  verifyPaymentOTP,
  initiatePayment,
} from '@/services/paymentService';

const transferSchema = z.object({
  amount: z.coerce.number().positive().min(100, 'Minimum transfer is ₦100'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof transferSchema>;

interface TransferFormWithOTPProps {
  onSuccess?: (reference: string) => void;
  onError?: (error: string) => void;
}

type Step = 'amount' | 'otp' | 'processing';

type TransferApiError = {
  response?: {
    data?: {
      error?: string;
      remaining?: number;
    };
  };
};

function generateTransactionReference(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  throw new Error('Browser does not support secure random generation');
}

export function TransferFormWithOTP({ onSuccess, onError }: TransferFormWithOTPProps) {
  const { user } = useAuthStore();
  const [step, setStep] = useState<Step>('amount');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  const [otpState, setOtpState] = useState({
    sessionToken: '',
    transactionReference: '',
    amount: 0,
    expiresInSeconds: 0,
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: { amount: 100, description: '' },
  });

  const amount = watch('amount') || 0;
  const fee = useMemo(() => (amount > 0 ? amount * 0.015 : 0), [amount]);
  const total = useMemo(() => amount + fee, [amount, fee]);

  // Timer countdown effect
  const handleRequestOTP = async (amount: number) => {
    if (!user?.phoneNumber) {
      setError('A verified phone number is required to proceed.');
      onError?.('Phone number not verified');
      return;
    }

    setIsLoading(true);
    setError('');

    const reference = generateTransactionReference();

    try {
      const response = await requestPaymentOTP({
        customerPhone: user.phoneNumber,
        transactionReference: reference,
        amount,
      });

      setOtpState({
        sessionToken: response.sessionToken,
        transactionReference: reference,
        amount,
        expiresInSeconds: response.expiresInSeconds,
      });

      setTimeLeft(response.expiresInSeconds);
      setAttemptsLeft(5);
      setOtp('');
      setStep('otp');

      // Start countdown
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setError('OTP expired. Please request a new one.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const typedErr = err as TransferApiError;
      const errorMsg = typedErr.response?.data?.error || 'Failed to request OTP';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await verifyPaymentOTP({
        sessionToken: otpState.sessionToken,
        otp,
        transactionReference: otpState.transactionReference,
      });

      if (response.verified) {
        // Proceed with payment initiation
        setStep('processing');
        await handleInitiatePayment(response.transferToken);
      }
    } catch (err: unknown) {
      const typedErr = err as TransferApiError;
      const errorMsg = typedErr.response?.data?.error || 'OTP verification failed';
      const remaining = typedErr.response?.data?.remaining;

      setError(errorMsg);
      if (remaining !== undefined) {
        setAttemptsLeft(remaining);
      }
      setOtp('');

      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitiatePayment = async (transferToken: string) => {
    try {
      const response = await initiatePayment({
        amount: otpState.amount,
        transactionReference: otpState.transactionReference,
        transferToken,
      });

      onSuccess?.(response.reference);
      setStep('amount');
      setOtp('');
      setOtpState({ sessionToken: '', transactionReference: '', amount: 0, expiresInSeconds: 0 });
    } catch (err: unknown) {
      const typedErr = err as TransferApiError;
      const errorMsg = typedErr.response?.data?.error || 'Payment initiation failed';
      setError(errorMsg);
      onError?.(errorMsg);
      setStep('otp');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await resendPaymentOTP({
        sessionToken: otpState.sessionToken,
        customerPhone: user?.phoneNumber || '',
        transactionReference: otpState.transactionReference,
        amount: otpState.amount,
      });

      setOtpState((prev) => ({
        ...prev,
        sessionToken: response.sessionToken,
        expiresInSeconds: response.expiresInSeconds,
      }));

      setTimeLeft(response.expiresInSeconds);
      setOtp('');
      setAttemptsLeft(5);

      // Restart countdown
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const typedErr = err as TransferApiError;
      const errorMsg = typedErr.response?.data?.error || 'Failed to resend OTP';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const onAmountSubmit = async (data: FormData) => {
    await handleRequestOTP(data.amount);
  };

  const isOtpExpired = timeLeft <= 0;
  const canVerifyOtp = otp.length === 6 && !isOtpExpired && !isLoading;

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-surface rounded-card border border-border">
      <h2 className="text-2xl font-display font-bold text-text-primary mb-6">Transfer Funds</h2>

      {/* STEP 1: Amount Entry */}
      {step === 'amount' && (
        <form onSubmit={handleSubmit(onAmountSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">
              Amount (NGN)
            </label>
            <input
              type="number"
              placeholder="100"
              {...register('amount')}
              className="w-full px-4 py-2 border border-border rounded-btn bg-subtle text-text-primary focus:outline-none focus:border-brand-amber focus:ring-1 focus:ring-brand-amber"
            />
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">
              Description (Optional)
            </label>
            <textarea
              placeholder="What is this transfer for?"
              {...register('description')}
              rows={2}
              className="w-full px-4 py-2 border border-border rounded-btn bg-subtle text-text-primary focus:outline-none focus:border-brand-amber focus:ring-1 focus:ring-brand-amber"
            />
          </div>

          {/* Fee Breakdown */}
          <div className="bg-subtle rounded-btn p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Amount</span>
              <span className="text-text-primary font-semibold">₦{amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Fee (1.5%)</span>
              <span className="text-text-primary font-semibold">₦{fee.toLocaleString()}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="text-text-primary font-semibold">Total</span>
              <span className="text-text-primary font-bold text-lg">₦{total.toLocaleString()}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-btn flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading || amount < 100}
            className="w-full"
          >
            {isLoading ? 'Requesting OTP...' : 'Request OTP'}
          </Button>
        </form>
      )}

      {/* STEP 2: OTP Verification */}
      {step === 'otp' && (
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-btn p-4">
            <p className="text-sm text-blue-600">
              We&apos;ve sent a 6-digit code to <strong>{user?.phoneNumber}</strong>
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-primary mb-3">
              Enter OTP Code
            </label>
            <OTPInput value={otp} onChange={setOtp} length={6} />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-btn flex items-start gap-3">
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

          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-text-secondary" />
            <span
              className={`${
                isOtpExpired ? 'text-red-500 font-semibold' : 'text-text-secondary'
              }`}
            >
              {isOtpExpired ? 'OTP Expired' : `Expires in ${timeLeft}s`}
            </span>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleVerifyOTP}
              disabled={!canVerifyOtp}
              loading={isLoading}
              className="flex-1"
            >
              Verify OTP
            </Button>
            <Button
              onClick={handleResendOTP}
              variant="secondary"
              disabled={isLoading || timeLeft > 30}
              loading={isLoading}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4" />
              Resend
            </Button>
          </div>

          <Button
            onClick={() => {
              setStep('amount');
              setOtp('');
              setError('');
              setOtpState({ sessionToken: '', transactionReference: '', amount: 0, expiresInSeconds: 0 });
            }}
            variant="ghost"
            className="w-full"
          >
            Back
          </Button>
        </div>
      )}

      {/* STEP 3: Processing */}
      {step === 'processing' && (
        <div className="text-center space-y-4">
          <div className="animate-spin">
            <div className="w-12 h-12 border-4 border-brand-amber border-t-transparent rounded-full mx-auto" />
          </div>
          <p className="text-text-secondary">Processing your transfer...</p>
        </div>
      )}
    </div>
  );
}
