import React, { ButtonHTMLAttributes, ElementType } from 'react';

interface StyledButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ai';
  size?: 'sm' | 'md' | 'lg';
  as?: ElementType;
}

const StyledButton: React.FC<StyledButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  as: Tag = 'button', 
  ...props 
}) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  const baseClasses = `font-bold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-2 ${sizeClasses[size]}`;

  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-700 shadow-primary/20',
    secondary: 'bg-secondary text-white hover:bg-secondary-700 shadow-secondary/20',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20',
    outline: 'bg-transparent border-2 border-primary text-primary hover:bg-primary/5',
    ai: 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-purple-500/30 ring-1 ring-white/20',
  };

  const buttonProps = Tag === 'button' ? { onClick } : {};

  return (
    <Tag className={`${baseClasses} ${variants[variant]}`} {...buttonProps} {...props}>
      {children}
    </Tag>
  );
};

export default StyledButton;
