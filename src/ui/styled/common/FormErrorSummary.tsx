'use client';

import React, { useEffect, useRef } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/ui/primitives/alert';

interface FormErrorSummaryProps {
  errors: Record<string, string | undefined>;
}

/**
 * Accessible summary of form validation errors.
 */
export function FormErrorSummary({ errors }: FormErrorSummaryProps): JSX.Element | null {
  const errorRef = useRef<HTMLDivElement>(null);
  const errorList = Object.entries(errors).filter(([, msg]) => !!msg);

  useEffect(() => {
    if (errorList.length > 0) {
      errorRef.current?.focus();
    }
  }, [errorList.length]);

  if (errorList.length === 0) return null;

  return (
    <Alert
      variant="destructive"
      ref={errorRef}
      tabIndex={-1}
      role="alert"
      aria-labelledby="form-error-title"
    >
      <AlertTitle id="form-error-title">Please correct the following errors:</AlertTitle>
      <AlertDescription asChild>
        <ul className="list-disc list-inside space-y-1">
          {errorList.map(([field, message]) => (
            <li key={field}>{message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
export default FormErrorSummary;
