import React from 'react';

/**
 * SkipLink component to allow keyboard users to jump directly to the main content.
 */
export function SkipLink(): React.ReactElement {
  return (
    <a
      href="#main-content"
      className="skip-link absolute left-4 top-[-40px] rounded bg-primary text-primary-foreground px-2 py-1 focus:top-4 focus-visible:top-4"
    >
      Skip to main content
    </a>
  );
}
