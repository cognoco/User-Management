import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Hero as HeadlessHero } from "../../headless/layout/Hero";

interface HeroProps {
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function Hero({ title, description, className, children }: HeroProps): JSX.Element {
  return (
    <HeadlessHero
      title={title}
      description={description}
      render={({ children }) => (
        <div className={cn("relative overflow-hidden", className)}>
          <div className="container relative z-10 mx-auto px-4 py-32 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  Welcome to User Management
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  Secure, scalable, and user-friendly authentication and user management solution.
                </p>
              </div>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                {children}
              </div>
            </div>
          </div>
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        </div>
      )}
    />
  );
}
