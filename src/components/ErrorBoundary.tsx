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
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-3xl border border-red-100 dark:border-red-900/20 shadow-xl m-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 mb-4 animate-bounce">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 font-display">Halaman Mengalami Kendala</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md text-sm">
            Terjadi masalah saat memuat bagian ini. Jangan khawatir, data Anda di server tetap aman.
          </p>
          <div className="flex gap-3">
            <StyledButton 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="text-xs"
            >
              <RefreshCw size={14} className="mr-2" />
              Muat Ulang
            </StyledButton>
            <StyledButton 
              onClick={() => this.setState({ hasError: false, error: null })} 
              variant="primary"
              className="text-xs"
            >
              Coba Lagi
            </StyledButton>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher Order Component to wrap any component with an ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
