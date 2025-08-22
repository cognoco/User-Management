import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { useIsMobile } from '@/lib/utils/responsive';
import {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from './form';

interface ResponsiveFormRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  description?: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}

/**
 * A responsive form row component that adjusts layout based on screen size
 * - On desktop: Displays label and control side by side
 * - On mobile: Stacks label and control vertically
 */
export function ResponsiveFormRow({
  label,
  description,
  children,
  required,
  error,
  className,
  ...props
}: ResponsiveFormRowProps) {
  const isMobile = useIsMobile();

  return (
    <div 
      className={cn(
        'py-2',
        !isMobile && 'grid grid-cols-12 items-start gap-4',
        className
      )}
      {...props}
    >
      <div className={cn(!isMobile && 'col-span-4')}>
        <div className="flex items-center">
          <span className="text-sm font-medium">{label}</span>
          {required && <span className="text-destructive ml-1">*</span>}
        </div>
        {description && (
          <p className="text-[0.8rem] text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>
      <div className={cn(!isMobile && 'col-span-8', isMobile && 'mt-1.5')}>
        {children}
        {error && (
          <p className="text-[0.8rem] font-medium text-destructive mt-1">{error}</p>
        )}
      </div>
    </div>
  );
}

interface ResponsiveFormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * A responsive container for a form that optimizes layout based on screen size
 */
export function ResponsiveForm({
  children,
  className,
  ...props
}: ResponsiveFormItemProps) {
  return (
    <div
      className={cn(
        'space-y-4 rounded-md border p-4 md:p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * A responsive helper for forms to render the content with consistent spacing
 */
export function ResponsiveFormItems({
  children,
  className,
  ...props
}: ResponsiveFormItemProps) {
  return (
    <div
      className={cn('space-y-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * A responsive footer for form buttons with consistent spacing
 */
export function ResponsiveFormFooter({
  children,
  className,
  ...props
}: ResponsiveFormItemProps) {
  const isMobile = useIsMobile();
  
  return (
    <div
      className={cn(
        'mt-6 flex items-center',
        isMobile ? 'flex-col-reverse space-y-reverse space-y-2' : 'justify-end space-x-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Works with react-hook-form to create a responsive form field
 * Uses the standard FormItem, FormLabel, etc. components internally
 */
export function ResponsiveFormField({
  name,
  label,
  description,
  required,
  children,
  className,
}: {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const isMobile = useIsMobile();
  
  return (
    <FormItem
      className={cn(
        !isMobile && 'grid grid-cols-12 items-start gap-4',
        className
      )}
    >
      <div className={cn(!isMobile && 'col-span-4')}>
        <FormLabel htmlFor={name} className="flex">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FormLabel>
        {description && <FormDescription>{description}</FormDescription>}
      </div>
      <div className={cn(!isMobile && 'col-span-8', isMobile && 'mt-1')}>
        <FormControl>{children}</FormControl>
        <FormMessage />
      </div>
    </FormItem>
  );
} 