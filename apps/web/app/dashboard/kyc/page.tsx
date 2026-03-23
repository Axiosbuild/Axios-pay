'use client';

import { DragEvent, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

const tiers = [
  { tier: 0, text: 'No transactions' },
  { tier: 1, text: '$200 / day' },
  { tier: 2, text: '$2,000 / day' },
  { tier: 3, text: '$10,000 / day' },
];

export default function KycPage() {
  const [status, setStatus] = useState<any>({ status: 'UNVERIFIED', tier: 0, documents: [] });
  const [documentType, setDocumentType] = useState('BVN');
  const [documentNumber, setDocumentNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchStatus = async () => {
    const res = await apiClient.get('/kyc/status');
    setStatus(res.data);
  };

  useEffect(() => {
    fetchStatus().catch(() => undefined);
  }, []);

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const selected = event.dataTransfer.files?.[0];
    if (selected) setFile(selected);
  };

  const upload = async () => {
    if (!file || !documentNumber) return;
    const form = new FormData();
    form.append('documentType', documentType);
    form.append('documentNumber', documentNumber);
    form.append('document', file);
    setUploading(true);
    await apiClient.post('/kyc/documents', form);
    await fetchStatus();
    setUploading(false);
  };

  return (
    <main className="min-h-screen bg-green-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-4xl text-gold-400">KYC</h1>

        <section className="mt-6 grid md:grid-cols-4 gap-3">
          {tiers.map((tier) => (
            <div key={tier.tier} className={`glass rounded-xl p-4 ${status.tier >= tier.tier ? 'border-green-400' : ''}`}>
              <p className="font-display text-xl">Tier {tier.tier}</p>
              <p className="text-sm text-white/70 mt-1">{tier.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 glass rounded-2xl p-6">
          <h2 className="font-display text-2xl text-gold-400">Upload identity document</h2>

          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <select className="bg-black/20 rounded p-3" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              <option>BVN</option>
              <option>NIN</option>
              <option>PASSPORT</option>
              <option>DRIVERS_LICENSE</option>
            </select>
            <input className="bg-black/20 rounded p-3" placeholder="Document number" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
            <button className="rounded bg-green-400 text-green-900 font-semibold" onClick={upload} disabled={uploading}>{uploading ? 'Uploading...' : 'Submit'}</button>
          </div>

          <div className="mt-4 border border-dashed border-white/30 rounded-lg p-8 text-center" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
            {file ? `Selected file: ${file.name}` : 'Drag and drop file here'}
          </div>

          <p className="mt-4 text-white/70">Current status: {status.status} · Tier {status.tier}</p>
        </section>
      </div>
    </main>
  );
}
