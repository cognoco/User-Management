import { Button, type ButtonProps } from './button';
import { Spinner } from './spinner';
import { cn } from '@/lib/utils/cn';

export interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
}

/**
 * Button with built-in loading spinner.
 */
export function LoadingButton({
  isLoading = false,
  loadingText = 'Loading',
  children,
  className,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      aria-busy={isLoading}
      disabled={isLoading || disabled}
      className={cn('relative', className)}
      {...props}
    >
      {isLoading && (
        <span className="absolute left-2 flex items-center" data-testid="button-spinner">
          <Spinner className="h-4 w-4" />
        </span>
      )}
      <span className={cn({ 'opacity-0': isLoading })}>{children}</span>
      {isLoading && <span className="sr-only">{loadingText}</span>}
    </Button>
  );
}

export default LoadingButton;
