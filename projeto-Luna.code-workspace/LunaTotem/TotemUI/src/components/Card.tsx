import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'highlighted';
}

export function Card({ children, className = '', onClick, variant = 'default' }: CardProps) {
  const baseStyles = 'bg-white rounded-2xl shadow-lg transition-all duration-200';
  const interactiveStyles = onClick ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]' : '';
  const variantStyles = variant === 'highlighted' ? 'border-2 border-[#D3A67F]' : '';

  return (
    <div
      className={`${baseStyles} ${interactiveStyles} ${variantStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
