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

const step1Schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email required'),
  nationality: z.enum(['NG', 'UG', 'KE', 'GH', 'ZA'], { required_error: 'Select your country' }),
});

const step2Schema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Enter phone in E.164 format e.g. +2348012345678'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1 | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema) });
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema) });

  async function onStep1(data: Step1) {
    setStep1Data(data);
    setStep(2);
  }

  async function onStep2(data: Step2) {
    if (!step1Data) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.auth.register({ ...step1Data, ...data });
      localStorage.setItem('axiospay_pending_userId', result.data.userId);
      router.push('/verify-email');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      const code = e?.response?.data?.error;
      const messages: Record<string, string> = {
        EMAIL_EXISTS: 'An account with this email already exists.',
        PHONE_EXISTS: 'An account with this phone number already exists.',
      };
      setError(messages[code || ''] || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="mb-6">
        <div className="w-full bg-border rounded-full h-1.5 mb-4">
          <div
            className="bg-brand-amber h-1.5 rounded-full transition-all duration-300"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
        <h2 className="font-display text-xl font-semibold text-text-primary">
          {step === 1 ? 'Create your account' : 'Almost there!'}
        </h2>
        <p className="text-sm text-text-muted mt-1">Step {step} of 2</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-error">{error}</div>
      )}

      {step === 1 ? (
        <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-4">
          <Input label="First Name" {...form1.register('firstName')} error={form1.formState.errors.firstName?.message} />
          <Input label="Last Name" {...form1.register('lastName')} error={form1.formState.errors.lastName?.message} />
          <Input label="Email Address" type="email" {...form1.register('email')} error={form1.formState.errors.email?.message} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Country</label>
            <select
              {...form1.register('nationality')}
              className="w-full px-3 py-2.5 rounded-btn border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-brand-amber text-text-primary"
            >
              <option value="">Select your country</option>
              <option value="NG">🇳🇬 Nigeria</option>
              <option value="UG">🇺🇬 Uganda</option>
              <option value="KE">🇰🇪 Kenya</option>
              <option value="GH">🇬🇭 Ghana</option>
              <option value="ZA">🇿🇦 South Africa</option>
            </select>
            {form1.formState.errors.nationality && (
              <p className="text-sm text-error">{form1.formState.errors.nationality.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full">Continue</Button>
        </form>
      ) : (
        <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-4">
          <Input label="Phone Number" type="tel" placeholder="+2348012345678" {...form2.register('phone')} error={form2.formState.errors.phone?.message} />
          <Input label="Password" type="password" {...form2.register('password')} error={form2.formState.errors.password?.message} />
          <p className="text-xs text-text-muted">Must be at least 8 characters.</p>
          <Button type="submit" loading={loading} className="w-full">Create Account</Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setStep(1)}>Back</Button>
        </form>
      )}

      <p className="text-center text-sm text-text-muted mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-amber hover:underline font-medium">Log in</Link>
      </p>
    </Card>
  );
}
