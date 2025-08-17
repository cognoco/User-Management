import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { Progress } from '@/ui/primitives/progress';

interface RateLimitFeedbackProps {
  windowMs: number;
  retryAfter?: number;
  maxAttempts?: number;
  remainingAttempts?: number;
  onCountdownComplete?: () => void;
}

export function RateLimitFeedback({
  windowMs = 15 * 60 * 1000, // Default 15 minutes
  retryAfter,
  maxAttempts = 100,
  remainingAttempts,
  onCountdownComplete
}: RateLimitFeedbackProps): JSX.Element {
  const [timeLeft, setTimeLeft] = useState(retryAfter || windowMs);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (timeLeft <= 0) {
      onCountdownComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1000;
        setProgress((newTime / (retryAfter || windowMs)) * 100);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, windowMs, retryAfter, onCountdownComplete]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <Alert variant="destructive" className="my-4">
      <AlertTitle>Too Many Attempts</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          For security reasons, you&apos;ve been temporarily rate limited.
          {remainingAttempts !== undefined && (
            <> You have {remainingAttempts} attempts remaining out of {maxAttempts}.</>
          )}
        </p>
        <p>
          Please wait {minutes} minutes and {seconds} seconds before trying again.
        </p>
        <Progress value={progress} className="h-1" />
      </AlertDescription>
    </Alert>
  );
} 