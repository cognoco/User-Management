import React from 'react';
import { Button } from '@/ui/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import type { SubscriptionPlan } from '@/types/subscription';

export interface PlanCardProps {
  plan: SubscriptionPlan;
  onSelect: (planId: string) => void;
}

export function PlanCard({ plan, onSelect }: PlanCardProps): React.ReactElement {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">${plan.price} / {plan.period}</p>
        <ul className="list-disc pl-4 text-sm space-y-1">
          {plan.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <Button className="w-full mt-4" onClick={() => onSelect(plan.id)}>
          Choose
        </Button>
      </CardContent>
    </Card>
  );
}
