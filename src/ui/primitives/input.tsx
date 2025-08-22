import * as React from 'react';

import { cn } from '@/lib/utils/cn';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Input type that is optimized for mobile
   * Provides appropriate keyboard type on mobile devices
   */
  mobileType?: 'tel' | 'email' | 'url' | 'search' | 'number' | 'date';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, mobileType, ...props }, ref) => {
    // Use mobileType if provided, otherwise fall back to type
    const inputType = mobileType || type;
    
    // Enhanced touch-friendly styles for mobile
    const enhancedClassName = cn(
      'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
      'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      // Enhanced touch target size for mobile
      'touch-manipulation',
      className
    );

    return (
      <input
        type={inputType}
        className={enhancedClassName}
        ref={ref}
        // Adds autocomplete attributes based on type to help browsers
        autoComplete={
          inputType === 'email' ? 'email' : 
          inputType === 'tel' ? 'tel' :
          inputType === 'url' ? 'url' :
          undefined
        }
        // Improved accessibility for screenreaders
        inputMode={
          inputType === 'tel' ? 'tel' : 
          inputType === 'email' ? 'email' :
          inputType === 'url' ? 'url' :
          inputType === 'number' ? 'numeric' :
          inputType === 'search' ? 'search' :
          undefined
        }
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
