import React from 'react';

const StyledButton = ({ children, onClick, variant = 'primary', ...props }) => {
  const baseClasses = 'px-6 py-2 font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105';

  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-700',
    secondary: 'bg-secondary text-white hover:bg-secondary-700',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white',
  };

  return (
    <button onClick={onClick} className={`${baseClasses} ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
};

export default StyledButton;
