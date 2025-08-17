'use client';

import { ErrorBoundary, DefaultErrorFallback } from '@/ui/styled/common/ErrorBoundary';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { FormLabel, FormMessage, FormControl } from '@/ui/primitives/form';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { PasswordRequirements } from '@/ui/styled/auth/PasswordRequirements';
import { ResetPasswordForm as HeadlessResetPasswordForm } from '@/ui/headless/auth/ResetPasswordForm';

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps): React.ReactElement {
  return (
    <ErrorBoundary fallback={DefaultErrorFallback}>
      <HeadlessResetPasswordForm
        token={token}
        render={({
          handleSubmit,
          passwordValue,
          setPasswordValue,
          confirmPasswordValue,
          setConfirmPasswordValue,
          isSubmitting,
          isValid,
          isSuccess,
          errors,
          touched,
          handleBlur
        }) => (
          <div className="w-full max-w-md mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Reset your password</h2>
              <p className="text-muted-foreground mt-2">Enter a new password for your account.</p>
            </div>

            {errors.form && (
              <Alert variant="destructive">
                <AlertDescription>{errors.form}</AlertDescription>
              </Alert>
            )}

            {isSuccess ? (
              <Alert>
                <AlertDescription>
                  Your password has been successfully reset. You can now log in with your new password.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <FormLabel htmlFor="password">New Password</FormLabel>
                  <FormControl>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter new password"
                      value={passwordValue}
                      onChange={e => setPasswordValue(e.target.value)}
                      onBlur={() => handleBlur('password')}
                      aria-invalid={touched.password && !!errors.password}
                      aria-describedby={touched.password && errors.password ? 'reset-password-error' : undefined}
                    />
                  </FormControl>
                  {touched.password && errors.password && (
                    <FormMessage id="reset-password-error">{errors.password}</FormMessage>
                  )}
                  <PasswordRequirements password={passwordValue} />
                </div>
                <div className="space-y-1.5">
                  <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPasswordValue}
                      onChange={e => setConfirmPasswordValue(e.target.value)}
                      onBlur={() => handleBlur('confirmPassword')}
                      aria-invalid={touched.confirmPassword && !!errors.confirmPassword}
                      aria-describedby={touched.confirmPassword && errors.confirmPassword ? 'confirm-reset-error' : undefined}
                    />
                  </FormControl>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <FormMessage id="confirm-reset-error">{errors.confirmPassword}</FormMessage>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting || !isValid}>
                  {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                </Button>
              </form>
            )}
          </div>
        )}
      />
    </ErrorBoundary>
  );
}
