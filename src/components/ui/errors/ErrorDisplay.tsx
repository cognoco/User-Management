import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { isRtlLanguage } from '@/lib/i18n/messages';
import { Alert, AlertTitle, AlertDescription } from '@/ui/primitives/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle as DialogHeading } from '@/ui/primitives/dialog';
import { Button } from '@/ui/primitives/button';
import { toast } from '@/lib/hooks/use-toast';
import { ScreenReaderAnnouncement } from '../ScreenReaderAnnouncement';

export type ErrorSeverity = 'info' | 'warning' | 'error';
export type ErrorStyle = 'inline' | 'toast' | 'modal';

export interface ErrorDisplayProps {
  message: string;
  details?: React.ReactNode;
  severity?: ErrorSeverity;
  style?: ErrorStyle;
  onRetry?: () => void;
  /** Modal open state when style="modal" */
  isOpen?: boolean;
  /** Modal open change handler when style="modal" */
  onOpenChange?: (open: boolean) => void;
}

const severityIcon = {
  info: null,
  warning: null,
  error: null,
};

/**
 * Generic error display component supporting inline, toast and modal styles.
 * Includes accessibility features and optional retry functionality.
 */
export function ErrorDisplay({
  message,
  details,
  severity = 'error',
  style = 'inline',
  onRetry,
  isOpen,
  onOpenChange,
}: ErrorDisplayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { i18n } = useTranslation();
  const dir = isRtlLanguage(i18n.language) ? 'rtl' : undefined;

  useEffect(() => {
    if (style === 'toast') {
      toast({
        title: message,
        description: details,
        variant: severity === 'error' ? 'destructive' : severity,
      });
    }
  }, [message, details, severity, style]);

  useEffect(() => {
    if (style === 'modal' && isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [style, isOpen]);

  if (style === 'toast') {
    return <ScreenReaderAnnouncement message={message} assertive />;
  }

  if (style === 'modal') {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent ref={dialogRef} tabIndex={-1} aria-labelledby="error-title" dir={dir}>
          <DialogHeader>
            <DialogHeading id="error-title">Error</DialogHeading>
          </DialogHeader>
          <p>{message}</p>
          {details && <div className="mt-2 text-sm text-muted-foreground">{details}</div>}
          <DialogFooter className="mt-4">
            {onRetry && (
              <Button onClick={onRetry}>Retry</Button>
            )}
            <Button variant="secondary" onClick={() => onOpenChange?.(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Alert role="alert" className="flex flex-col gap-2" aria-live="assertive" dir={dir}>
      <AlertTitle>{message}</AlertTitle>
      {details && <AlertDescription>{details}</AlertDescription>}
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="self-start">
          Retry
        </Button>
      )}
    </Alert>
  );
}

interface SpecializedProps extends Omit<ErrorDisplayProps, 'severity' | 'style' | 'message'> {
  message?: string;
  style?: ErrorStyle;
}

export function ValidationErrorDisplay({ message = 'Validation error', ...rest }: SpecializedProps) {
  return <ErrorDisplay severity="error" message={message} {...rest} />;
}

export function NetworkErrorDisplay({
  message = 'Network error. Please check your connection.',
  style = 'toast',
  ...rest
}: SpecializedProps) {
  return <ErrorDisplay severity="error" message={message} style={style} {...rest} />;
}

export function NotFoundErrorDisplay({
  message = 'The requested resource was not found.',
  style = 'inline',
  ...rest
}: SpecializedProps) {
  return <ErrorDisplay severity="warning" message={message} style={style} {...rest} />;
}

export function PermissionErrorDisplay({
  message = 'You do not have permission to perform this action.',
  style = 'inline',
  ...rest
}: SpecializedProps) {
  return <ErrorDisplay severity="error" message={message} style={style} {...rest} />;
}

export default ErrorDisplay;
