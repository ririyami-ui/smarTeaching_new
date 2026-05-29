import React, { Component, ErrorInfo, ReactNode } from 'react';
import StyledButton from './StyledButton';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Ops! Terjadi Kesalahan</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
            Halaman ini gagal dimuat. Jangan khawatir, data Anda tetap aman. Silakan coba muat ulang halaman.
          </p>
          <StyledButton 
            onClick={() => window.location.reload()} 
            variant="primary"
          >
            <RefreshCw size={18} />
            Muat Ulang Halaman
          </StyledButton>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left text-xs overflow-auto max-w-full text-red-500">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.children;
  }
}

export default ErrorBoundary;
