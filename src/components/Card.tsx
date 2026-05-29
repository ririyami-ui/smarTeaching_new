import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5 md:p-6',
  lg: 'p-6 sm:p-8',
};

const Card: React.FC<CardProps> = ({ children, className = '', padding = 'md', hover = false }) => {
  return (
    <div
      className={`card-glass ${
        paddingClasses[padding]
      } ${
        hover ? 'hover:shadow-lg hover:border-primary/30 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;

