import { cn } from "@/lib/utils";
import { Box, Layers, Zap } from "lucide-react";
// Already uses headless implementation
import {
  Features as HeadlessFeatures,
  FeatureItem,
  FeaturesProps as HeadlessProps,
} from "../../headless/layout/Features";

export interface FeaturesProps extends Omit<HeadlessProps, "children"> {
  className?: string;
}

const defaultFeatures: FeatureItem[] = [
  {
    name: "Modular Components",
    description:
      "Build your application with reusable, production-ready components.",
    icon: Box,
  },
  {
    name: "Flexible Architecture",
    description:
      "Designed to scale with your needs, from simple apps to complex systems.",
    icon: Layers,
  },
  {
    name: "Lightning Fast",
    description: "Optimized for performance with modern web technologies.",
    icon: Zap,
  },
];

export function Features({
  title,
  description,
  features,
  className,
}: FeaturesProps): React.ReactElement {
  return (
    <HeadlessFeatures
      title={title}
      description={description}
      features={features ?? defaultFeatures}
    >
      {({ title, description, features }) => (
        <div className={cn("py-24 sm:py-32", className)}>
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {title}
              </h2>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                {description}
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                {features.map((feature) => (
                  <div key={feature.name?.toString()} className="flex flex-col">
                    {feature.href ? (
                      <a
                        href={feature.href}
                        className="flex items-center gap-x-3 text-lg font-semibold leading-7 hover:text-primary focus:text-primary transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <feature.icon
                          className="h-5 w-5 flex-none text-primary"
                          aria-hidden="true"
                        />
                        {feature.name}
                      </a>
                    ) : feature.onClick ? (
                      <button
                        type="button"
                        onClick={feature.onClick}
                        className="flex items-center gap-x-3 text-lg font-semibold leading-7 hover:text-primary focus:text-primary transition-colors bg-transparent border-none p-0 m-0 cursor-pointer"
                      >
                        <feature.icon
                          className="h-5 w-5 flex-none text-primary"
                          aria-hidden="true"
                        />
                        {feature.name}
                      </button>
                    ) : (
                      <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7">
                        <feature.icon
                          className="h-5 w-5 flex-none text-primary"
                          aria-hidden="true"
                        />
                        {feature.name}
                      </dt>
                    )}
                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                      <p className="flex-auto">{feature.description}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}
    </HeadlessFeatures>
  );
}
