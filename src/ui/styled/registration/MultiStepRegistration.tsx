import { useState, useRef, useEffect } from 'react';

import { Label } from '@/ui/primitives/label';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Alert } from '@/ui/primitives/alert';
import { Checkbox } from '@/ui/primitives/checkbox';
import { Progress } from '@/ui/primitives/progress';
import { HeadlessMultiStepRegistration } from '@/ui/headless/registration/MultiStepRegistration';


const steps = ['Account', 'Profile', 'Verification', 'Terms'];

export function MultiStepRegistration(): React.ReactElement {
  const [verificationCode, setVerificationCode] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [currentStepState, setCurrentStepState] = useState(0);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Focus first field when step changes
  useEffect(() => {
    firstFieldRef.current?.focus();
  }, [currentStepState]);

  // Handle final submission
  const handleComplete = async (data: Record<string, any>): Promise<void> => {
    // Registration data would be processed here
    // Here you would typically call your registration service
    // Data is intentionally used here for processing
    void data;
  };

  // Validate step data
  const validateStep = (step: number, data: Record<string, any>): boolean => {
    const errors: Record<string, string> = {};
    
    switch(step) {
      case 0: // Account step
        if (!data.email) errors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Invalid email format';
        
        if (!data.password) errors.password = 'Password is required';
        else if (data.password.length < 8) errors.password = 'Password must be at least 8 characters';
        break;
        
      case 1: // Profile step
        if (!data.name) errors.name = 'Name is required';
        else if (data.name.length < 2) errors.name = 'Name must be at least 2 characters';
        break;
        
      case 3: // Terms step
        if (!data.acceptTerms) errors.acceptTerms = 'You must accept the terms and conditions';
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  return (
    <HeadlessMultiStepRegistration
      steps={steps}
      onComplete={handleComplete}
      render={({ currentStep, next, back, setValue, values, handleSubmit }) => {
        // Update local state when currentStep changes
        if (currentStep !== currentStepState) {
          setCurrentStepState(currentStep);
        }

        const progress = ((currentStep + 1) / steps.length) * 100;
        
        const renderStep = (): React.ReactNode => {
          switch (currentStep) {
            case 0:
              return (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      ref={firstFieldRef}
                      value={values.email || ''}
                      onChange={(e) => setValue('email', e.target.value)}
                    />
                    {validationErrors.email && (
                      <Alert variant="destructive">{validationErrors.email}</Alert>
                    )}
                  </div>
      
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={values.password || ''}
                      onChange={(e) => setValue('password', e.target.value)}
                    />
                    {validationErrors.password && (
                      <Alert variant="destructive">{validationErrors.password}</Alert>
                    )}
                  </div>
                </>
              );
      
            case 1:
              return (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      ref={firstFieldRef}
                      value={values.name || ''}
                      onChange={(e) => setValue('name', e.target.value)}
                    />
                    {validationErrors.name && (
                      <Alert variant="destructive">{validationErrors.name}</Alert>
                    )}
                  </div>
      
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={values.phone || ''}
                      onChange={(e) => setValue('phone', e.target.value)}
                    />
                    {validationErrors.phone && (
                      <Alert variant="destructive">{validationErrors.phone}</Alert>
                    )}
                  </div>
                </>
              );
      
            case 2:
              return (
                <div className="space-y-4">
                  <p>Enter the verification code sent to your email</p>
                  <Input
                    ref={firstFieldRef}
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value);
                      setValue('verificationCode', e.target.value);
                    }}
                    placeholder="Enter code"
                  />
                </div>
              );
      
            case 3:
              return (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={values.acceptTerms || false}
                      onCheckedChange={(checked) => setValue('acceptTerms', checked)}
                    />
                    <Label htmlFor="terms">
                      I accept the terms and conditions
                    </Label>
                  </div>
                  {validationErrors.acceptTerms && (
                    <Alert variant="destructive">{validationErrors.acceptTerms}</Alert>
                  )}
                </div>
              );
      
            default:
              return null;
          }
        };
        
        return (
          <div className="space-y-8" role="region" aria-live="polite">
            <Progress value={progress} className="w-full" />
            
            <div className="text-center">
              <h2 className="text-2xl font-bold">{steps[currentStep]}</h2>
              <p className="text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
      
            <form onSubmit={(e) => {
              e.preventDefault();
              if (validateStep(currentStep, values)) {
                if (currentStep < steps.length - 1) {
                  next();
                } else {
                  handleSubmit(e);
                }
              }
            }} className="space-y-6">
              {renderStep()}
      
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={back}
                  disabled={currentStep === 0}
                >
                  Previous
                </Button>
                
                <Button type="submit">
                  {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
                </Button>
              </div>
            </form>
          </div>
        );
      }}
    />
  );
}