import React, { SelectHTMLAttributes } from 'react';

interface StyledSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

const StyledSelect: React.FC<StyledSelectProps> = ({ label, children, className, ...props }) => (
  <div className="space-y-1.5 w-full">
    {label && (
      <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-2">
        {label}
      </label>
    )}
    <select
      {...props}
      className={`w-full px-5 py-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-300 dark:text-white hover:border-primary/30 shadow-sm appearance-none cursor-pointer ${
        className || ''
      }`}
    >
      {children}
    </select>
  </div>
);

export default StyledSelect;

