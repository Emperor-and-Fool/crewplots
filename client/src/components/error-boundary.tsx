import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetErrorBoundary: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.log('🚨 ERROR BOUNDARY: getDerivedStateFromError triggered');
    console.log('🚨 ERROR BOUNDARY: Error:', error.message);
    console.log('🚨 ERROR BOUNDARY: Stack:', error.stack);
    console.log('🚨 ERROR BOUNDARY: Timestamp:', new Date().toISOString());
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log('🚨 ERROR BOUNDARY: componentDidCatch called');
    console.log('🚨 ERROR BOUNDARY: Error message:', error.message);
    console.log('🚨 ERROR BOUNDARY: Error stack:', error.stack);
    console.log('🚨 ERROR BOUNDARY: Component stack:', errorInfo.componentStack);
    console.log('🚨 ERROR BOUNDARY: Error info:', errorInfo);
    console.log('🚨 ERROR BOUNDARY: Current URL:', window.location.href);
    console.log('🚨 ERROR BOUNDARY: Current time:', new Date().toISOString());
  }

  resetErrorBoundary = () => {
    console.log('🔄 ERROR BOUNDARY: Reset button clicked');
    console.log('🔄 ERROR BOUNDARY: Resetting error state');
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      console.log('🚨 ERROR BOUNDARY: Rendering error state');
      console.log('🚨 ERROR BOUNDARY: Error details:', this.state.error);
      
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-red-50 rounded-lg border border-red-200">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Permission Error</h2>
          <p className="text-gray-600 mb-4 max-w-md">
            You don't have permission to access this feature, or there was an error checking your permissions.
          </p>
          <div className="space-y-2">
            <Button onClick={this.resetErrorBoundary} variant="outline" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
            <p className="text-sm text-gray-500">
              If this problem persists, please contact your administrator.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
export { ErrorBoundary };

// Functional wrapper for easier use with hooks
export function PermissionErrorBoundary({ 
  children, 
  workflow, 
  permission 
}: { 
  children: React.ReactNode;
  workflow?: string;
  permission?: string;
}) {
  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Permission Required</h3>
          <p className="text-gray-600 mb-3 max-w-sm">
            {workflow && permission 
              ? `You need "${permission}" permission for the "${workflow}" workflow to access this feature.`
              : "You don't have permission to access this feature."
            }
          </p>
          <Button onClick={resetErrorBoundary} size="sm" variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}