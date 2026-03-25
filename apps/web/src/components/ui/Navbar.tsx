'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from './Button';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur border-b border-border shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-xl text-navy">Axios Pay</p>
          <p className="text-xs text-text-muted">Cross-Border FX, Unlocked.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Log In</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Open Account</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
