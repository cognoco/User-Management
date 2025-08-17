import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import SetupWizardHeadless, { SetupStep } from '@/ui/headless/onboarding/SetupWizard';

export function SetupWizard(): React.ReactElement {
  const steps: SetupStep[] = [
    {
      id: 'preferences',
      title: 'Set Your Preferences',
      component: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex items-center space-x-2">
              <Checkbox id="darkMode" />
              <Label htmlFor="darkMode">Enable Dark Mode</Label>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Language</Label>
            <select className="w-full p-2 border rounded">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      id: 'notifications',
      title: 'Configure Notifications',
      component: (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="emailNotifications" />
            <Label htmlFor="emailNotifications">Email Notifications</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox id="pushNotifications" />
            <Label htmlFor="pushNotifications">Push Notifications</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox id="smsNotifications" />
            <Label htmlFor="smsNotifications">SMS Notifications</Label>
          </div>
        </div>
      ),
    },
    {
      id: 'features',
      title: 'Explore Key Features',
      component: (
        <div className="space-y-4">
          <p>Quick tour of the main capabilities:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Create and manage teams</li>
            <li>Update your profile at any time</li>
            <li>Configure security options</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'completion',
      title: 'You\'re All Set!',
      component: (
          <div className="text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <p>Your setup is complete! You&apos;re ready to start using the app.</p>
          </div>
      ),
    },
  ];

  return (
    <SetupWizardHeadless
      steps={steps}
      render={({
        currentStep,
        currentStepIndex,
        progress,
        handleNext,
        handlePrevious,
      }) => (
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>{currentStep.title}</CardTitle>
          </CardHeader>

          <CardContent>
            <Progress value={progress} className="mb-6" />
            {currentStep.component}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
            >
              Previous
            </Button>
            <Button onClick={handleNext}>
              {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </CardFooter>
        </Card>
      )}
    />
  );
}