import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  label?: string;
}

export default function LoadingSpinner({ size = 'md', text, label }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const displayText = label || text || 'Memuat data...';

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`${sizeClasses[size]} border-4 border-gray-200 dark:border-gray-700 border-t-primary rounded-full animate-spin mb-4`} />
      {displayText && (
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{displayText}</p>
      )}
    </div>
  );
}
