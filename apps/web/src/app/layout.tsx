import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Axios Pay — Cross-Border FX, Unlocked.',
  description: 'Swap African currencies at live mid-market rates. NGN, UGX, KES, GHS, ZAR.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <Providers>
          <div className="max-w-md mx-auto min-h-screen bg-gray-50 shadow-xl relative overflow-hidden">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
