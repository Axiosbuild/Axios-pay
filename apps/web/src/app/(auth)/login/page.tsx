'use client';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OTPInput } from '@/components/ui/OTPInput';

const schema = z.object({
  identifier: z.string().min(1, 'Username or phone number is required'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Invalid username/phone number or password.',
  EMAIL_NOT_VERIFIED: 'Please verify your email before logging in.',
  TERMS_NOT_ACCEPTED: 'You must accept the Terms and Conditions before continuing.',
  RATE_LIMIT: 'Too many attempts. Please wait 15 minutes.',
};

function LoginPageContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  const message = searchParams.get('message');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError('');
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

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
      <div className="mb-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          <Sparkles className="h-3.5 w-3.5" />
          Welcome Back
        </p>
        <h2 className="mt-4 font-display text-2xl font-bold text-slate-950">Log in to your account</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Access your wallets and start sending money instantly.</p>
      </div>

      {message && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">{error}</div>
      )}

      {!requires2FA ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Username or Phone Number"
            placeholder="duke123 or +2348012345678"
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
            <Link href="/forgot-password" className="text-xs font-medium text-emerald-700 transition hover:text-emerald-600">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" loading={loading} className="mt-2 w-full bg-slate-900 hover:bg-slate-800">
            Log In
          </Button>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Use your registered phone or username for faster sign-in.</p>
            <p className="mt-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> If 2FA is enabled, keep your authenticator app ready.</p>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Enter the 6-digit code from your authenticator app.</p>
          <OTPInput value={twoFactorCode} onChange={setTwoFactorCode} length={6} />
          <Button onClick={onVerify2FA} loading={loading} className="mt-2 w-full bg-slate-900 hover:bg-slate-800" disabled={twoFactorCode.length !== 6}>
            Verify & Continue
          </Button>
        </div>
      )}

      <p className="mt-8 border-t border-slate-200 pt-6 text-center text-sm text-slate-600">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-emerald-700 transition hover:text-emerald-600">
          Create one now
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
