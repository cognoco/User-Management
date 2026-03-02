import React, { Component, ErrorInfo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { Button } from '@/ui/primitives/button';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { analytics } from '@/lib/utils/analytics';
import type { ApplicationError } from '@/core/common/errors';

export interface ErrorBoundaryOptions {
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryProps extends ErrorBoundaryOptions {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    analytics.trackError(error);
    this.props.onError?.(error, info);
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error, this.resetErrorBoundary)
          : this.props.fallback;
      }

      return (
        <Alert variant="destructive">
          <AlertOctagon className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <div className="mt-2">
              {this.state.error.message || 'An unexpected error occurred'}
            </div>
            <Button
              onClick={this.resetErrorBoundary}
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Try Again</span>
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  options?: ErrorBoundaryOptions
): React.ComponentType<P> {
  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );

  Wrapped.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
}

export function CriticalSectionErrorBoundary({ children, ...options }: ErrorBoundaryProps) {
  return (
    <ErrorBoundary
      {...options}
      fallback={options.fallback || ((error, reset) => (
        <Alert variant="destructive">
          <AlertOctagon className="h-4 w-4" />
          <AlertTitle>Critical failure</AlertTitle>
          <AlertDescription>
            <div className="mt-2">{error.message}</div>
            <Button onClick={reset} variant="outline" size="sm" className="mt-4 gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reload</span>
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    >
      {children}
    </ErrorBoundary>
  );
}

export function RouteErrorBoundary({ children, ...options }: ErrorBoundaryProps) {
  return (
    <ErrorBoundary
      {...options}
      fallback={options.fallback || ((error, reset) => (
        <Alert variant="destructive">
          <AlertOctagon className="h-4 w-4" />
          <AlertTitle>Page failed to load</AlertTitle>
          <AlertDescription>
            <div className="mt-2">{error.message}</div>
            <Button onClick={reset} variant="outline" size="sm" className="mt-4 gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    >
      {children}
    </ErrorBoundary>
  );
}

export function FormErrorBoundary({ children, ...options }: ErrorBoundaryProps) {
  return (
    <ErrorBoundary
      {...options}
      fallback={options.fallback || ((error, reset) => (
        <Alert variant="destructive">
          <AlertOctagon className="h-4 w-4" />
          <AlertTitle>Form Error</AlertTitle>
          <AlertDescription>
            <div className="mt-2">{error.message}</div>
            <Button type="button" onClick={reset} variant="outline" size="sm" className="mt-4 gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Try Again</span>
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    >
      {children}
    </ErrorBoundary>
  );
}

export type { ApplicationError };
export default ErrorBoundary;
