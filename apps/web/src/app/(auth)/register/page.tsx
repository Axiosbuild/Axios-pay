'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCountryDetect } from '@/hooks/useCountryDetect';
import { CountrySelect } from '@/components/ui/CountrySelect';
import { CountryConfig, getCountryByCode } from '@/lib/countries';

const schema = z.object({
  email: z.string().email('Valid email required'),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or less')
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,28}[a-zA-Z0-9])?$/, 'Username must start/end with a letter or number.'),
  country: z.string().regex(/^[A-Z]{2}$/, 'Select a supported country'),
  localPhone: z.string().regex(/^\d{6,14}$/, 'Use digits only for local phone number'),
  identity: z.string().trim().min(5, 'Use a valid government-issued ID value').max(50, 'Identity value is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm Password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig | null>(null);
  const { detected, loading: detectingCountry } = useCountryDetect();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const country = selectedCountry ?? getCountryByCode(detected.code);

  async function onStep2(data: FormData) {
    setLoading(true);
    setError('');
    try {
      const phoneNumber = `${country.phonePrefix}${data.localPhone}`.replace(/\s/g, '');
      const payload = {
        email: data.email,
        username: data.username,
        phoneNumber,
        identity: data.identity,
        password: data.password,
        country: country.code,
        nationality: country.name,
        currency: country.currency,
      };

      console.log('[register] API payload:', payload);

      const result = await api.auth.register(payload);

      const userId = result.data?.data?.userId as string | undefined;
      const onboardingToken = result.data?.data?.onboardingToken as string | undefined;
      if (!userId || !onboardingToken) {
        setError('Registration failed. Please try again.');
        return;
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('terms_onboarding_token', onboardingToken);
      }

      router.push(
        `/verify-email?email=${encodeURIComponent(data.email)}&onboardingToken=${encodeURIComponent(onboardingToken)}`
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      const code = e?.response?.data?.error || '';
      const messages: Record<string, string> = {
        EMAIL_EXISTS: 'This email is already registered. Try logging in instead.',
        USERNAME_EXISTS: 'This username is already registered. Choose a different one.',
        PHONE_EXISTS: 'This phone number is already registered.',
        INVALID_PHONE_NUMBER: 'Please enter a valid phone number.',
        UNSUPPORTED_PHONE_COUNTRY: 'This phone number country is not yet supported.',
      };
      setError(messages[code] || 'Registration failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
      <div className="mb-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          <Sparkles className="h-3.5 w-3.5" />
          Open Account
        </p>
        <h2 className="mt-4 font-display text-2xl font-bold text-slate-950">Create your Axios Pay account</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Set up your profile to start funding wallets and moving money across supported corridors.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">{error}</div>
      )}

      <form onSubmit={handleSubmit(onStep2)} className="space-y-4">
        <Input label="Email Address" type="email" {...register('email')} error={errors.email?.message} />
        <Input label="Username" {...register('username')} error={errors.username?.message} />
        <input type="hidden" value={country.code} {...register('country')} />
        <CountrySelect
          label="Country"
          value={country.code}
          onChange={(value) => setSelectedCountry(value)}
          disabled={detectingCountry}
          error={errors.country?.message}
        />
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <Input label="Code" value={country.phonePrefix} readOnly />
          </div>
          <div className="col-span-2">
            <Input label="Phone Number" placeholder="7054321125" {...register('localPhone')} error={errors.localPhone?.message} />
          </div>
        </div>
        <Input label="Identity Information" placeholder="National ID / Government ID" {...register('identity')} error={errors.identity?.message} />
        <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
        <Input label="Confirm Password" type="password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> KYC and security verification are required before high-value transfers.</p>
          <p className="mt-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Use your legal details to avoid onboarding delays.</p>
        </div>

        <Button type="submit" loading={loading} disabled={loading} className="mt-2 w-full bg-slate-900 hover:bg-slate-800">
          Create Account
        </Button>
      </form>

      <p className="mt-8 border-t border-slate-200 pt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-emerald-700 transition hover:text-emerald-600">Log in</Link>
      </p>
    </div>
  );
}
