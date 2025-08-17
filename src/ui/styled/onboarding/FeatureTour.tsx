import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import FeatureTourHeadless, { TourStep } from '@/ui/headless/onboarding/FeatureTour';

const tourSteps: TourStep[] = [
  {
    title: 'Navigation',
    description: 'Access all your important features from the main menu',
    element: '#main-nav',
  },
  {
    title: 'Dashboard',
    description: 'View your activity and important metrics here',
    element: '#dashboard',
  },
  {
    title: 'Settings',
    description: 'Customize your experience and preferences',
    element: '#settings',
  },
];

export function FeatureTour(): React.ReactElement {
  return (
    <FeatureTourHeadless
      steps={tourSteps}
      render={({
        currentStep,
        currentStepIndex,
        isOpen,
        setIsOpen,
        handleNext,
        handlePrevious,
      }) => (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{currentStep.title}</DialogTitle>
            </DialogHeader>

            <div className="p-4">
              <p className="text-muted-foreground">{currentStep.description}</p>
            </div>

            <DialogFooter className="flex justify-between">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStepIndex === 0}
                >
                  Previous
                </Button>
                <Button onClick={handleNext}>
                  {currentStepIndex === tourSteps.length - 1 ? 'Finish' : 'Next'}
                </Button>
              </div>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Skip Tour
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    />
  );
}