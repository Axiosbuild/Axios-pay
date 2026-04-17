'use client';

import { Button } from '@/components/ui/Button';

interface CheckoutButtonProps {
  loading?: boolean;
  onClick?: () => void;
  children?: string;
}

export default function CheckoutButton({
  loading = false,
  onClick,
  children = 'Proceed to Checkout',
}: CheckoutButtonProps) {
  return (
    <Button type="button" loading={loading} className="w-full" onClick={onClick}>
      {children}
    </Button>
  );
}
