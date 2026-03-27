import Link from 'next/link';
import { Card } from '@/components/ui/Card';

const LINKS = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/transactions', label: 'Transactions' },
  { href: '/admin/agents', label: 'Agents' },
  { href: '/admin/rates', label: 'Rates' },
];

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-page p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary mb-6">Admin</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card hover className="min-h-24 flex items-center font-semibold text-text-primary">{link.label}</Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
