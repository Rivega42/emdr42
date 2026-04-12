import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const variantClasses = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => (
  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${variantClasses[variant]}`}>
    {children}
  </span>
);
