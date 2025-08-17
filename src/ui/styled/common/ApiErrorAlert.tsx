'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { useTranslation } from 'react-i18next';
import { isRtlLanguage } from '@/lib/i18n/messages';

interface ApiErrorAlertProps {
  message: string | null;
  onRetry?: () => void;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Display user-friendly API error messages with optional retry.
 */
export function ApiErrorAlert({ message, onRetry, severity = 'low' }: ApiErrorAlertProps): React.ReactElement | null {
  const { i18n } = useTranslation();
  const dir = isRtlLanguage(i18n.language) ? 'rtl' : undefined;
  if (!message) return null;

  const variant = severity === 'low' ? 'default' : 'destructive';

  return (
    <Alert variant={variant} role="alert" dir={dir}>
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-2">
        <span>{message}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="underline text-sm"
          >
            Retry
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
}
export default ApiErrorAlert;
