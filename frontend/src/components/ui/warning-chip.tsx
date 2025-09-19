import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface WarningChipProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'warning' | 'error' | 'info';
}

export const WarningChip: React.FC<WarningChipProps> = ({ 
  children, 
  className = '',
  size = 'md',
  variant = 'warning'
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base'
  };

  const variantClasses = {
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full border font-medium
      ${sizeClasses[size]} 
      ${variantClasses[variant]} 
      ${className}
    `}>
      <ExclamationTriangleIcon className={iconSizeClasses[size]} />
      {children}
    </span>
  );
};
