import { PlanSelector as HeadlessPlanSelector, type PlanSelectorProps } from '@/ui/headless/subscription/PlanSelector';
import { PlanCard } from './PlanCard';
import { Alert } from '@/ui/primitives/alert';

export type StyledPlanSelectorProps = Omit<PlanSelectorProps, 'render'>;

export function PlanSelector(props: StyledPlanSelectorProps): React.ReactElement {
  return (
    <HeadlessPlanSelector
      {...props}
      render={({ plans, isLoading, error, selectPlan }) => {
        if (isLoading) return <div>Loading plans...</div>;
        if (error) return <Alert variant="destructive">{error}</Alert>;
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onSelect={selectPlan} />
            ))}
          </div>
        );
      }}
    />
  );
}
