import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Axios Pay — Cross-Border FX, Unlocked.',
  description: 'Swap African currencies at live mid-market rates. NGN, UGX, KES, GHS, ZAR.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
