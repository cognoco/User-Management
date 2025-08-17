import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';
import { CheckCircle2, Circle } from 'lucide-react';
import ProgressTrackerHeadless from '@/ui/headless/onboarding/ProgressTracker';

export function ProgressTracker(): React.ReactElement {
  return (
    <ProgressTrackerHeadless
      render={({ steps, progress }) => (
        <Card>
          <CardHeader>
            <CardTitle>Setup Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Progress value={progress} className="w-full" />

            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.id} className="flex items-center space-x-3">
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {progress === 100 ? (
                'All steps completed!'
              ) : (
                `${Math.round(progress)}% complete`
              )}
            </div>
          </CardContent>
        </Card>
      )}
    />
  );
}