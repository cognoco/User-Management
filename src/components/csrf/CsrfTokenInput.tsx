'use client';

import React from 'react';
import { useCsrfToken } from '@/hooks/csrf/useCsrfToken';

/**
 * Hidden input field that includes the CSRF token
 * Add this to forms that submit to protected endpoints
 * 
 * @example
 * ```tsx
 * <form onSubmit={handleSubmit}>
 *   <CsrfTokenInput />
 *   <input name="email" type="email" />
 *   <button type="submit">Submit</button>
 * </form>
 * ```
 */
export function CsrfTokenInput() {
  const { token } = useCsrfToken();

  if (!token) {
    // Don't render anything if token is not yet loaded
    return null;
  }

  return (
    <input
      type="hidden"
      name="csrfToken"
      value={token}
      readOnly
    />
  );
}

/**
 * CSRF-protected form wrapper
 * Automatically includes CSRF token and handles submission
 */
interface CsrfFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  action: string;
  method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  onSuccess?: (response: Response) => void;
  onError?: (error: Error) => void;
  children: React.ReactNode;
}

export function CsrfForm({
  action,
  method = 'POST',
  onSuccess,
  onError,
  children,
  onSubmit,
  ...props
}: CsrfFormProps) {
  const { fetchWithCSRF } = useCsrfToken();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Call custom onSubmit if provided
    if (onSubmit) {
      onSubmit(e);
    }

    // Get form data
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetchWithCSRF(action, {
        method,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      } else {
        console.error('Form submission error:', error);
      }
    }
  };

  return (
    <form {...props} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}

/**
 * HOC to wrap any component with CSRF token context
 */
export function withCSRF<P extends object>(
  Component: React.ComponentType<P & { csrfToken: string }>
): React.FC<P> {
  return function WithCSRFComponent(props: P) {
    const { token } = useCsrfToken();

    if (!token) {
      // You might want to show a loading state here
      return <div>Loading security token...</div>;
    }

    return <Component {...props} csrfToken={token} />;
  };
}