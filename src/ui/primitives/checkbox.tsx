import * as React from 'react';
import dynamic from 'next/dynamic';
const CheckboxPrimitive = {
  Root: dynamic(() => import('@radix-ui/react-checkbox').then(m => m.Root), { ssr: false }) as any,
  Indicator: dynamic(() => import('@radix-ui/react-checkbox').then(m => m.Indicator), { ssr: false }) as any,
};
const CheckIcon = dynamic(() => import('@radix-ui/react-icons').then(m => m.CheckIcon), { ssr: false }) as any;
import { cn } from '@/lib/utils';

// Simple implementation without any state management to avoid issues
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-sm border border-primary',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      'cursor-pointer',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center text-current')}
    >
      <CheckIcon className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
