import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Axios Pay — Move Money Across Africa',
  description: 'Cross-border payments and currency exchange for African travelers. Instant swaps at live rates across 12 currencies.',
  keywords: 'fintech, africa, cross-border payments, currency exchange, NGN, KES, GHS, UGX',
  openGraph: {
    title: 'Axios Pay',
    description: 'Move money across Africa like it\'s one country.',
    type: 'website',
    url: 'https://axiospay.africa',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
