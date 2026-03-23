'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function SettingsPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [qr, setQr] = useState('');
  const [totp, setTotp] = useState('');

  const save = async () => {
    await apiClient.patch('/users/me', { firstName, lastName, phone });
    alert('Profile updated');
  };

  const setup2fa = async () => {
    const res = await apiClient.post('/auth/2fa/enable');
    setQr(res.data.qrCode);
  };

  const confirm2fa = async () => {
    await apiClient.post('/auth/2fa/confirm', { totp });
    alert('2FA enabled');
  };

  return (
    <main className="min-h-screen bg-green-900 text-white p-6">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-5">
        <section className="glass rounded-2xl p-6">
          <h1 className="font-display text-3xl text-gold-400">Profile</h1>
          <div className="mt-4 space-y-3">
            <input className="w-full bg-black/20 rounded p-3" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input className="w-full bg-black/20 rounded p-3" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <input className="w-full bg-black/20 rounded p-3" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className="w-full py-3 rounded bg-green-400 text-green-900 font-semibold" onClick={save}>Save profile</button>
          </div>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="font-display text-3xl text-gold-400">2FA Management</h2>
          <button className="mt-4 px-4 py-2 rounded bg-gold-400 text-green-900 font-semibold" onClick={setup2fa}>Generate QR</button>
          {qr ? (
            <div className="mt-4">
              <img src={qr} alt="2FA QR" className="bg-white p-2 rounded" />
              <input className="w-full mt-3 bg-black/20 rounded p-3 amount" placeholder="123456" value={totp} onChange={(e) => setTotp(e.target.value)} />
              <button className="w-full mt-3 py-3 rounded bg-green-400 text-green-900 font-semibold" onClick={confirm2fa}>Confirm 2FA</button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
