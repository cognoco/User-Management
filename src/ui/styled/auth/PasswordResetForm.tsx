/**
 * Styled Password Reset Form Component
 * 
 * This component provides a default styled implementation of the headless PasswordResetForm.
 * It uses the headless component for behavior and adds UI rendering with Shadcn UI components.
 */

import React from 'react';
import { PasswordResetForm as HeadlessPasswordResetForm, PasswordResetFormProps } from '../../headless/auth/PasswordResetForm';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Label } from '@/ui/primitives/label';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons';

export interface StyledPasswordResetFormProps extends Omit<PasswordResetFormProps, 'render'> {
  /**
   * Optional title for the password reset form
   */
  title?: string;
  
  /**
   * Optional description for the password reset form
   */
  description?: string;
  
  /**
   * Optional footer content
   */
  footer?: React.ReactNode;
  
  /**
   * Optional className for styling
   */
  className?: string;
}

export function PasswordResetForm({
  title = 'Reset Password',
  description = 'Enter your email to receive a password reset link',
  footer,
  className,
  ...headlessProps
}: StyledPasswordResetFormProps): React.ReactElement {
  return (
    <HeadlessPasswordResetForm
      {...headlessProps}
      render={({
        handleSubmit,
        emailValue,
        setEmailValue,
        isSubmitting,
        isSuccess,
        errors,
        touched,
        handleBlur
      }) => (
        <Card className={className}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircledIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium">Reset Link Sent</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    If an account exists with {emailValue}, you will receive a password reset link shortly.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    onBlur={() => handleBlur('email')}
                    disabled={isSubmitting}
                    aria-invalid={touched.email && !!errors.email}
                    className={touched.email && errors.email ? 'border-red-500' : ''}
                  />
                  {touched.email && errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
                
                {errors.form && (
                  <Alert variant="destructive" className="mt-4">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <AlertDescription>{errors.form}</AlertDescription>
                  </Alert>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            )}
          </CardContent>
          
          {footer && <CardFooter>{footer}</CardFooter>}
        </Card>
      )}
    />
  );
}
