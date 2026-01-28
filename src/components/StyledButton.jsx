import React from 'react';

const StyledButton = ({ children, onClick, variant = 'primary', as: Tag = 'button', ...props }) => {
  const baseClasses = 'px-6 py-2 font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105';

  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-700',
    secondary: 'bg-secondary text-white hover:bg-secondary-700',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white',
    ai: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-lg shadow-blue-500/30 dark:shadow-none ring-1 ring-white/20 hover:ring-white/40',
  };

  const buttonProps = Tag === 'button' ? { onClick } : {};

  return (
    <Tag className={`${baseClasses} ${variants[variant]}`} {...buttonProps} {...props}>
      {children}
    </Tag>
  );
};

export default StyledButton;