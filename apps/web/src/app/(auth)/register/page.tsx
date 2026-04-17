'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

const schema = z.object({
  email: z.string().email('Valid email required'),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or less')
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,28}[a-zA-Z0-9])?$/, 'Username must start/end with a letter or number.'),
  countryCode: z.string().regex(/^\+[1-9]\d{0,3}$/, 'Use country code format like +234'),
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
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onStep2(data: FormData) {
    setLoading(true);
    setError('');
    try {
      const phoneNumber = `${data.countryCode}${data.localPhone}`.replace(/\s/g, '');
      const payload = {
        email: data.email,
        username: data.username,
        phoneNumber,
        identity: data.identity,
        password: data.password,
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

      router.push(`/terms?token=${encodeURIComponent(onboardingToken)}`);
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
    <Card>
      <h2 className="font-display text-xl font-semibold text-text-primary mb-6">Create your account</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-error">{error}</div>
      )}

      <form onSubmit={handleSubmit(onStep2)} className="space-y-4">
        <Input label="Email Address" type="email" {...register('email')} error={errors.email?.message} />
        <Input label="Username" {...register('username')} error={errors.username?.message} />
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <Input label="Code" placeholder="+234" {...register('countryCode')} error={errors.countryCode?.message} />
          </div>
          <div className="col-span-2">
            <Input label="Phone Number" placeholder="7054321125" {...register('localPhone')} error={errors.localPhone?.message} />
          </div>
        </div>
        <Input label="Identity Information" placeholder="National ID / Government ID" {...register('identity')} error={errors.identity?.message} />
        <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
        <Input label="Confirm Password" type="password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
        <Button type="submit" loading={loading} disabled={loading} className="w-full">Create Account</Button>
      </form>

      <p className="text-center text-sm text-text-muted mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-amber hover:underline font-medium">Log in</Link>
      </p>
    </Card>
  );
}
