import React, { ButtonHTMLAttributes, ElementType } from 'react';

interface StyledButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'ai';
  size?: 'sm' | 'md' | 'lg';
  as?: ElementType;
  fullWidth?: boolean;
}

const StyledButton: React.FC<StyledButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  as: Tag = 'button', 
  ...props 
}) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  const baseClasses = `font-bold rounded-2xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${
    fullWidth ? 'w-full' : ''
  } ${sizeClasses[size]}`;

  const variants = {
    primary:
      'bg-gradient-to-br from-primary to-primary-700 text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30',
    secondary:
      'bg-gradient-to-br from-secondary to-emerald-700 text-white shadow-lg shadow-secondary/20 hover:shadow-xl hover:shadow-secondary/30',
    danger:
      'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30',
    outline:
      'bg-transparent border-2 border-primary/40 text-primary hover:border-primary hover:bg-primary/5',
    ghost:
      'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
    ai:
      'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 ring-1 ring-white/20 relative overflow-hidden group',
  };

  const buttonProps = Tag === 'button' ? { onClick } : {};

  return (
    <Tag
      className={`${baseClasses} ${variants[variant] || variants.primary} touch-action-manipulation`}
      {...buttonProps}
      {...props}
    >
      {variant === 'ai' && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      )}
      {children}
    </Tag>
  );
};

export default StyledButton;

