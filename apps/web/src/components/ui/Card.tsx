import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ children, hover, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-card shadow-sm p-6 ${
        hover ? 'hover:shadow-md transition-shadow cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
