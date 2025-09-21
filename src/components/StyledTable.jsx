import React from 'react';

const StyledTable = ({ headers, children, maxHeight, overflowY }) => (
  <div className={`overflow-x-auto bg-surface-light dark:bg-surface-dark shadow-lg rounded-2xl ${maxHeight ? `max-h-[${maxHeight}]` : ''} ${overflowY ? `overflow-y-${overflowY}` : ''}`}>
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          {headers.map((header, index) => (
            <th
              key={header.label || index}
              scope="col"
              className={`px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider ${header.className || ''}`}
            >
              {header.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
        {children}
      </tbody>
    </table>
  </div>
);

export default StyledTable;
