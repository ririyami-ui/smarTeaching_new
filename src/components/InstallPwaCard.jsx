import React from 'react';
import { X, Download } from 'lucide-react';

const InstallPwaCard = ({ onInstall, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Download className="h-6 w-6 text-primary" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Instal Aplikasi Smart Teaching</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Install aplikasi ini di perangkat Anda untuk akses offline dan pengalaman yang lebih baik.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={onInstall}
              className="w-full bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Install
            </button>
            <button
              onClick={onDismiss}
              className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Nanti Saja
            </button>
          </div>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPwaCard;
