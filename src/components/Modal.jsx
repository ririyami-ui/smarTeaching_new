// src/components/Modal.jsx
import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Komponen modal yang dapat digunakan kembali.
 * Modal ini menggunakan createPortal untuk merender di luar DOM utama.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Konten yang akan ditampilkan di dalam modal.
 * @param {function} props.onClose - Fungsi yang dipanggil saat modal ditutup.
 */
export default function Modal({ children, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 p-4 font-sans">
      <div className="relative flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-800 dark:text-white">
        <div className="flex items-center justify-end border-b border-gray-200 p-2 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-6 md:p-8" style={{ maxHeight: '70vh' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
