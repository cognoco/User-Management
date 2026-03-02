import React, { useState } from 'react';
import { MFAVerificationForm as HeadlessMFAVerificationForm, MFAVerificationFormProps } from '../../headless/auth/MFAVerificationForm';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Label } from '@/ui/primitives/label';
import { api } from '@/lib/api/axios';

export interface StyledMFAVerificationFormProps
  extends Omit<MFAVerificationFormProps, 'render' | 'onUseBackupCode'> {
  onCancel?: () => void;
  enableResendCode?: boolean;
  enableRememberDevice?: boolean;
  mfaMethod?: 'sms' | 'email' | 'totp' | 'other';
  className?: string;
}

export function MFAVerificationForm({
  onCancel,
  enableResendCode = true,
  enableRememberDevice = true,
  mfaMethod = 'totp',
  className,
  ...headlessProps
}: StyledMFAVerificationFormProps) {
  const [isUsingBackupCode, setIsUsingBackupCode] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState(false);

  const handleToggleBackupCode = () => {
    setIsUsingBackupCode((prev) => !prev);
  };

  // Resend code logic (not provided by headless component)
  const handleResendCode = async () => {
    setResendMessage(null);
    setResendTimer(30); // 30 seconds cooldown
    try {
      let endpoint = '';
      if (mfaMethod === 'sms') endpoint = '/auth/mfa/resend-sms';
      else if (mfaMethod === 'email') endpoint = '/auth/mfa/resend-email';
      else return;
      await api.post(endpoint, { sessionId: headlessProps.sessionId });
      setResendMessage('[i18n:auth.mfa.resendSuccess]');
    } catch {
      setResendMessage('[i18n:auth.mfa.resendError]');
    }
  };

  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  return (
    <HeadlessMFAVerificationForm
      {...headlessProps}
      onUseBackupCode={handleToggleBackupCode}
      render={({
        handleSubmit,
        verificationCode,
        setVerificationCode,
        isSubmitting,
        errors,
        touched,
        handleBlur
      }) => (
        <div className={`space-y-6 w-full max-w-md mx-auto ${className ?? ''}`}>
          <div className="text-center">
            <h1 className="text-2xl font-bold">[i18n:auth.mfa.title]</h1>
            <p className="text-muted-foreground mt-2">
              {isUsingBackupCode
                ? '[i18n:auth.mfa.enterBackupCodePrompt]'
                : '[i18n:auth.mfa.enterCodePrompt]'}
            </p>
          </div>

          {errors.form && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}
          {resendMessage && (
            <Alert variant="default" role="status">
              <AlertDescription>{resendMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfa-code">
                  {isUsingBackupCode
                    ? '[i18n:auth.mfa.backupCodeLabel]'
                    : '[i18n:auth.mfa.codeLabel]'}
                </Label>
                <Input
                  id="mfa-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  onBlur={handleBlur}
                  placeholder={isUsingBackupCode ? 'XXXX-XXXX' : '000000'}
                  autoComplete="one-time-code"
                  autoFocus
                  aria-invalid={touched.verificationCode && !!errors.verificationCode}
                  aria-describedby={touched.verificationCode && errors.verificationCode ? 'mfa-code-error' : undefined}
                />
                {touched.verificationCode && errors.verificationCode && (
                  <p id="mfa-code-error" className="text-sm text-destructive">{errors.verificationCode}</p>
                )}
              </div>

              {enableRememberDevice && !isUsingBackupCode && (
                <div className="flex items-center gap-2">
                  <input
                    id="remember-device"
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="accent-primary"
                  />
                  <label htmlFor="remember-device" className="text-sm cursor-pointer">
                    [i18n:auth.mfa.rememberDevice]
                  </label>
                  <span
                    className="text-xs text-muted-foreground"
                    title="[i18n:auth.mfa.rememberDeviceHelp]"
                    aria-label="[i18n:auth.mfa.rememberDeviceHelp]"
                  >
                    ?
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  [i18n:auth.mfa.verifyButton]
                </Button>

                {enableResendCode && !isUsingBackupCode && (mfaMethod === 'sms' || mfaMethod === 'email') && (
                  <Button
                    type="button"
                    variant="link"
                    className="px-0"
                    onClick={handleResendCode}
                    disabled={resendTimer > 0}
                    aria-disabled={resendTimer > 0}
                  >
                    {resendTimer > 0
                      ? `[i18n:auth.mfa.resendCode] (${resendTimer}s)`
                      : '[i18n:auth.mfa.resendCode]'}
                  </Button>
                )}

                <Button type="button" variant="link" className="px-0" onClick={handleToggleBackupCode}>
                  {isUsingBackupCode ? '[i18n:auth.mfa.useTOTPInstead]' : '[i18n:auth.mfa.useBackupCode]'}
                </Button>

                {onCancel && (
                  <Button type="button" variant="ghost" onClick={onCancel} className="w-full">
                    [i18n:common.cancel]
                  </Button>
                )}
              </div>
            </form>
        </div>
      )}
    />
  );
}
