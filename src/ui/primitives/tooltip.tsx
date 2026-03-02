import * as React from 'react';
// Minimal tooltip implementation to avoid external dependency
// This provides the same interface as the Radix Tooltip components

const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="relative inline-block">{children}</span>
);

const TooltipTrigger: React.FC<React.ComponentProps<'span'> & { asChild?: boolean }> = ({ children, asChild, ...props }) => (
  <span {...props}>{children}</span>
);

const TooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="tooltip"
      className={className}
      {...props}
    >
      {children}
    </div>
  )
);
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
