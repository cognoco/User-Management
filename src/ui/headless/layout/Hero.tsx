import { ReactNode } from 'react';

export interface HeroProps {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  render: (props: {
    title: ReactNode;
    description: ReactNode;
    children?: ReactNode;
  }) => React.ReactNode;
}

const defaultTitle = (
  <>
    Build Better Apps <span className="text-primary">Faster</span>
  </>
);

const defaultDescription =
  'A complete solution for building modern web applications. Start with our production-ready components and focus on what matters most - your business logic.';

export function Hero({ title = defaultTitle, description = defaultDescription, children, render }: HeroProps): React.ReactElement {
  return <>{render({ title, description, children })}</>;
}
