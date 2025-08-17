'use client';

import React from 'react';
import HeadlessErrorBoundary from '@/ui/headless/common/ErrorBoundary';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ComponentType<{ error: Error; reset: () => void }>;
}

export function ErrorBoundary({ children, fallback: Fallback }: ErrorBoundaryProps): React.ReactElement {
  return (
    <HeadlessErrorBoundary
      render={({ error, reset, children: safeChildren }) =>
        error ? <Fallback error={error} reset={reset} /> : <>{safeChildren}</>
      }
    >
      {children}
    </HeadlessErrorBoundary>
  );
}

export function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }): React.ReactElement {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
      <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
      <p className="text-sm text-red-700 mb-4">{error.message || 'An unexpected error occurred'}</p>
      <button
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}

export default ErrorBoundary;
