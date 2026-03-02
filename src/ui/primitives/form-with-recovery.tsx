import React, { useId, useTransition } from 'react';
import { ErrorBoundary } from '@/ui/primitives/error-boundary';
import { Button } from '@/ui/primitives/button';

type FormWithRecoveryProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'children'> & {
  /**
   * Function to call when the form is submitted successfully
   */
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  
  /**
   * Function to call when form submission fails
   */
  onError?: (error: Error) => void;
  
  /**
   * Component to render as fallback when an error occurs
   */
  fallback?: React.ReactNode;
  
  /**
   * Whether to show a recovery button when an error occurs
   */
  showRecoveryButton?: boolean;
  
  /**
   * Text to show on the recovery button
   */
  recoveryButtonText?: string;

  /**
   * Children can be a render function receiving { isPending } or regular ReactNode
   */
  children: React.ReactNode | ((props: { isPending: boolean }) => React.ReactNode);
};

/**
 * A form component that can recover from errors during submission
 * Optimized for React 19 with useTransition
 */
export function FormWithRecovery({
  children,
  onSubmit,
  onError,
  fallback,
  showRecoveryButton = true,
  recoveryButtonText = 'Try Again',
  ...props
}: FormWithRecoveryProps) {
  const formId = useId();
  const [isPending, startTransition] = useTransition();
  
  // Handle form submission with error boundary
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Use React 19's useTransition to avoid blocking the UI during submission
    startTransition(async () => {
      try {
        await onSubmit(e);
      } catch (error) {
        if (onError && error instanceof Error) {
          onError(error);
        } else {
          console.error('Form submission error:', error);
        }
      }
    });
  };
  
  // Custom fallback UI when an error occurs
  const renderFallback = (error: Error, reset: () => void) => {
    if (fallback) return fallback;
    
    return (
      <div className="p-4 border border-red-300 rounded-md bg-red-50 dark:bg-red-900/10 dark:border-red-800">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">Form Error</h3>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          {error.message || 'An error occurred while submitting the form'}
        </p>
        {showRecoveryButton && (
          <Button 
            type="button"
            variant="outline" 
            className="mt-4 text-sm"
            onClick={reset}
          >
            {recoveryButtonText}
          </Button>
        )}
      </div>
    );
  };
  
  return (
    <ErrorBoundary fallback={renderFallback}>
      <form
        {...props}
        id={props.id || `form-${formId}`}
        onSubmit={handleSubmit}
        aria-busy={isPending}
      >
        {typeof children === 'function' 
          ? children({ isPending }) 
          : children}
      </form>
    </ErrorBoundary>
  );
} 