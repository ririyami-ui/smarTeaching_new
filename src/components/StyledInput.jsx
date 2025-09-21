import React from 'react';

const StyledInput = ({ ...props }) => (
  <input
    {...props}
    className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary dark:text-text-dark"
  />
);

export default StyledInput;
