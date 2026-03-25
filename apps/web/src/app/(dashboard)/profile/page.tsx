'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const KYC_DESCRIPTIONS: Record<string, string> = {
  PENDING: 'Identity verification not yet started.',
  SUBMITTED: 'Your documents are under review.',
  APPROVED: 'Identity verified. You have full access.',
  REJECTED: 'Verification failed. Please contact support.',
};

const NATIONALITY_NAMES: Record<string, string> = {
  NG: '🇳🇬 Nigeria', UG: '🇺🇬 Uganda', KE: '🇰🇪 Kenya', GH: '🇬🇭 Ghana', ZA: '🇿🇦 South Africa',
};

const schema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

export default function ProfilePage() {
  const { user, updateUser, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { firstName: user?.firstName, lastName: user?.lastName },
  });

  async function onSubmit(data: { firstName?: string; lastName?: string }) {
    setLoading(true);
    try {
      const result = await api.users.updateMe(data);
      updateUser(result.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      const stored = localStorage.getItem('axiospay-auth');
      const refreshToken = stored ? JSON.parse(stored)?.state?.refreshToken : null;
      if (refreshToken) await api.auth.logout({ refreshToken });
    } catch { /* ignore */ }
    clearAuth();
    router.push('/');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-text-primary">Profile</h1>

      {/* Account info */}
      <Card>
        <h2 className="font-semibold text-text-primary mb-4">Account Details</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Email</span>
            <span className="text-text-primary">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Phone</span>
            <span className="text-text-primary">{user?.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Country</span>
            <span className="text-text-primary">{NATIONALITY_NAMES[user?.nationality || ''] || user?.nationality}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Member since</span>
            <span className="text-text-primary">{user ? new Date(user.createdAt || Date.now()).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      </Card>

      {/* KYC */}
      <Card>
        <h2 className="font-semibold text-text-primary mb-3">Identity Verification</h2>
        <div className="flex items-center gap-3 mb-2">
          <Badge status={user?.kycStatus || 'PENDING'} />
          <span className="text-sm text-text-secondary">{KYC_DESCRIPTIONS[user?.kycStatus || 'PENDING']}</span>
        </div>
      </Card>

      {/* Edit name */}
      <Card>
        <h2 className="font-semibold text-text-primary mb-4">Edit Profile</h2>
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-btn text-sm text-success">Profile updated!</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="First Name" {...register('firstName')} error={errors.firstName?.message} />
          <Input label="Last Name" {...register('lastName')} error={errors.lastName?.message} />
          <Button type="submit" loading={loading}>Save Changes</Button>
        </form>
      </Card>

      {/* Logout */}
      <Card>
        <Button variant="danger" onClick={handleLogout} className="w-full">Log Out</Button>
      </Card>
    </div>
  );
}
