import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantClasses = {
  primary: 'bg-brand-amber text-white hover:bg-brand-gold disabled:opacity-50',
  secondary: 'bg-navy text-white hover:bg-navy-medium disabled:opacity-50',
  ghost: 'border border-border text-text-primary hover:bg-subtle disabled:opacity-50',
  danger: 'bg-error text-white hover:opacity-90 disabled:opacity-50',
};

const sizeClasses = {
  sm: 'px-3 py-2 text-sm min-h-11',
  md: 'px-4 py-2.5 text-base min-h-11',
  lg: 'px-6 py-3 text-lg min-h-11',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-btn transition-all duration-200 cursor-pointer ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
