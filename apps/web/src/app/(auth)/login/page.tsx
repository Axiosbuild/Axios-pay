'use client';
import { Suspense, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { OTPInput } from '@/components/ui/OTPInput';

const schema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_NOT_VERIFIED: 'Please verify your email first.',
  RATE_LIMIT: 'Too many attempts. Please wait 15 minutes.',
};

function LoginPageContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const identifier = useWatch({ control, name: 'identifier' });
  const isEmail = typeof identifier === 'string' && identifier.includes('@');

  const verified = searchParams.get('verified') === 'true';

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError('');
    setInfo('');
    setShowResend(false);
    try {
      const result = await api.auth.login(data);
      if (result.data.requires2FA) {
        setRequires2FA(true);
        setTempToken(result.data.tempToken);
      } else {
        setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      const code = e?.response?.data?.error || '';
      setError(ERROR_MESSAGES[code] || 'Login failed. Please try again.');
      setShowResend(code === 'EMAIL_NOT_VERIFIED');
    } finally {
      setLoading(false);
    }
  }

  async function onVerify2FA() {
    setLoading(true);
    setError('');
    try {
      const result = await api.auth.verify2FA({ tempToken, token: twoFactorCode });
      setAuth(result.data.user, result.data.accessToken, result.data.refreshToken);
      router.push('/dashboard');
    } catch {
      setError('Invalid authentication code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!isEmail) {
      setError('Enter your email address to resend verification.');
      return;
    }
    setResending(true);
    setError('');
    setInfo('');
    try {
      await api.auth.resendOTP({ email: identifier });
      setInfo('Verification email sent! Check your inbox.');
    } catch {
      setError('Failed to resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <Card>
      <h2 className="font-display text-xl font-semibold text-text-primary mb-6">Welcome back</h2>

      {verified && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-btn text-sm text-success">
          ✅ Email verified successfully! You can now log in.
        </div>
      )}
      {info && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-btn text-sm text-success">{info}</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-error">{error}</div>
      )}

      {!requires2FA ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email or Phone"
            placeholder="you@example.com"
            {...register('identifier')}
            error={errors.identifier?.message}
          />
          <Input
            label="Password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />
          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-brand-amber hover:underline">Forgot password?</Link>
          </div>
          <Button type="submit" loading={loading} className="w-full">Log In</Button>
          {showResend && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleResendVerification}
              loading={resending}
              disabled={resending}
              className="w-full"
            >
              Resend verification email
            </Button>
          )}
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Enter the 6-digit code from your authenticator app.</p>
          <OTPInput value={twoFactorCode} onChange={setTwoFactorCode} length={6} />
          <Button onClick={onVerify2FA} loading={loading} className="w-full" disabled={twoFactorCode.length !== 6}>
            Verify & Continue
          </Button>
        </div>
      )}

      <p className="text-center text-sm text-text-muted mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-brand-amber hover:underline font-medium">Sign up</Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Card><p className="text-sm text-text-muted">Loading...</p></Card>}>
      <LoginPageContent />
    </Suspense>
  );
}
