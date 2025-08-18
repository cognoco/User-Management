import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Progress } from '@/ui/primitives/progress';
import { 
  Lock, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface PasswordResetFormProps {
  token: string;
  onSubmit: (password: string, token: string) => Promise<void>;
  onSuccess?: () => void;
  loginUrl?: string;
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export function PasswordResetForm({
  token,
  onSubmit,
  onSuccess,
  loginUrl = '/login',
  minLength = 8,
  requireUppercase = true,
  requireLowercase = true,
  requireNumbers = true,
  requireSpecialChars = true,
}: PasswordResetFormProps): React.ReactElement {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    
    if (password.length >= minLength) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    if (score <= 2) return { score: 25, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score: 50, label: 'Fair', color: 'bg-orange-500' };
    if (score <= 5) return { score: 75, label: 'Good', color: 'bg-yellow-500' };
    return { score: 100, label: 'Strong', color: 'bg-green-500' };
  };

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < minLength) {
      errors.push(`At least ${minLength} characters`);
    }
    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('One uppercase letter');
    }
    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push('One lowercase letter');
    }
    if (requireNumbers && !/[0-9]/.test(password)) {
      errors.push('One number');
    }
    if (requireSpecialChars && !/[^a-zA-Z0-9]/.test(password)) {
      errors.push('One special character');
    }
    
    return errors;
  };

  const getPasswordRequirements = () => {
    const requirements = [];
    requirements.push({ text: `At least ${minLength} characters`, met: password.length >= minLength });
    if (requireUppercase) {
      requirements.push({ text: 'One uppercase letter', met: /[A-Z]/.test(password) });
    }
    if (requireLowercase) {
      requirements.push({ text: 'One lowercase letter', met: /[a-z]/.test(password) });
    }
    if (requireNumbers) {
      requirements.push({ text: 'One number', met: /[0-9]/.test(password) });
    }
    if (requireSpecialChars) {
      requirements.push({ text: 'One special character', met: /[^a-zA-Z0-9]/.test(password) });
    }
    return requirements;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setValidationErrors(passwordErrors);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(password, token);
      setIsSuccess(true);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err) {
      setError('Failed to reset password. The link may have expired. Please request a new one.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrength = calculatePasswordStrength(password);
  const requirements = getPasswordRequirements();

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Password Reset Successful</CardTitle>
          <CardDescription>
            Your password has been successfully reset
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              You can now sign in with your new password.
            </AlertDescription>
          </Alert>

          <Link href={loginUrl} className="block">
            <Button className="w-full">
              Continue to Login
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Create New Password</CardTitle>
        <CardDescription>
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setValidationErrors([]);
                }}
                placeholder="Enter new password"
                disabled={isSubmitting}
                aria-invalid={validationErrors.length > 0}
                aria-describedby="password-requirements"
                autoComplete="new-password"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {password && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Password Strength</span>
                <span className="font-medium">{passwordStrength.label}</span>
              </div>
              <Progress value={passwordStrength.score} className="h-2" />
              
              <div id="password-requirements" className="space-y-1 mt-2">
                {requirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {req.met ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <X className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={isSubmitting}
                aria-invalid={confirmPassword && password !== confirmPassword}
                aria-describedby={confirmPassword && password !== confirmPassword ? 'confirm-error' : undefined}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p id="confirm-error" className="text-sm text-destructive">
                Passwords do not match
              </p>
            )}
          </div>

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Password must contain:
                <ul className="list-disc list-inside mt-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !password || !confirmPassword}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resetting Password...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Reset Password
              </>
            )}
          </Button>
        </CardContent>
      </form>
      <CardFooter>
        <p className="text-xs text-center text-muted-foreground w-full">
          Having trouble?{' '}
          <Link href="/auth/forgot-password" className="underline">
            Request a new reset link
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}