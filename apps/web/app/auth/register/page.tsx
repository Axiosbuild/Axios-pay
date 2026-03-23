'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';

const steps = ['Identity', 'Contact', 'Security', 'Review'];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: 'NG',
    residenceCountry: 'NG',
    email: '',
    phone: '',
    password: '',
  });

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(form.firstName && form.lastName && form.dateOfBirth);
    if (step === 1) return Boolean(form.email && form.phone);
    if (step === 2) return form.password.length >= 8;
    return true;
  }, [form, step]);

  const submit = async () => {
    setLoading(true);
    try {
      await apiClient.post('/auth/register', form);
      window.location.href = '/auth/login';
    } catch {
      setLoading(false);
      alert('Unable to register. Please check your details.');
    }
  };

  return (
    <main className="min-h-screen bg-green-900 text-white px-6 py-10">
      <div className="max-w-2xl mx-auto glass rounded-2xl p-8">
        <h1 className="font-display text-4xl text-gold-400">Create your account</h1>
        <p className="text-white/70 mt-1">Step {step + 1} of 4 · {steps[step]}</p>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="mt-6 space-y-3"
          >
            {step === 0 && (
              <>
                <input className="w-full bg-black/20 rounded p-3" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                <input className="w-full bg-black/20 rounded p-3" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                <input className="w-full bg-black/20 rounded p-3" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
              </>
            )}

            {step === 1 && (
              <>
                <input className="w-full bg-black/20 rounded p-3" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input className="w-full bg-black/20 rounded p-3" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </>
            )}

            {step === 2 && (
              <input className="w-full bg-black/20 rounded p-3" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            )}

            {step === 3 && (
              <pre className="bg-black/20 rounded p-4 text-sm whitespace-pre-wrap">{JSON.stringify(form, null, 2)}</pre>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex justify-between">
          <button className="px-4 py-2 rounded border border-white/20 disabled:opacity-30" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Back
          </button>

          {step < 3 ? (
            <button className="px-4 py-2 rounded bg-green-400 text-green-900 font-semibold disabled:opacity-40" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
              Continue
            </button>
          ) : (
            <button className="px-4 py-2 rounded bg-gold-400 text-green-900 font-semibold" disabled={loading} onClick={submit}>
              {loading ? 'Creating...' : 'Create account'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
