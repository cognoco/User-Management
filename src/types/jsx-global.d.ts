// Re-export JSX namespace globally for React 19 compatibility.
// @types/react v19 no longer provides a global JSX namespace;
// code using `JSX.Element` without qualification needs this shim.
import type { JSX } from 'react';
export { JSX };
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type Element = React.JSX.Element;
    type IntrinsicElements = React.JSX.IntrinsicElements;
    type ElementClass = React.JSX.ElementClass;
  }
}
