'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [totp, setTotp] = useState('');

  const onLogin = async () => {
    const res = await apiClient.post('/auth/login', { email, password });

    if (res.data.requires2FA) {
      setRequires2FA(true);
      setUserId(res.data.userId);
      setTempToken(res.data.tempToken);
      return;
    }

    setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    window.location.href = '/dashboard';
  };

  const onVerify2FA = async () => {
    const res = await apiClient.post('/auth/login/2fa', { userId, tempToken, totp });
    setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
    window.location.href = '/dashboard';
  };

  return (
    <main className="min-h-screen bg-green-900 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md glass rounded-2xl p-8">
        <h1 className="font-display text-4xl text-gold-400">Sign in</h1>

        {!requires2FA ? (
          <div className="mt-6 space-y-3">
            <input className="w-full bg-black/20 rounded p-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="w-full bg-black/20 rounded p-3" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="w-full py-3 rounded bg-green-400 text-green-900 font-semibold" onClick={onLogin}>Continue</button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-white/70">Enter your 2FA authenticator code.</p>
            <input className="w-full bg-black/20 rounded p-3 amount" placeholder="123456" value={totp} onChange={(e) => setTotp(e.target.value)} />
            <button className="w-full py-3 rounded bg-gold-400 text-green-900 font-semibold" onClick={onVerify2FA}>Verify 2FA</button>
          </div>
        )}
      </div>
    </main>
  );
}
