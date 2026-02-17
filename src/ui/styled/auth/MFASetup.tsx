/**
 * Styled MFA Setup Component
 * 
 * This component provides a default styled implementation of the headless MFASetup.
 * It uses the headless component for behavior and adds UI rendering with Shadcn UI components.
 */

import React from 'react';
import { MFASetup as HeadlessMFASetup, MFASetupProps } from '../../headless/auth/MFASetup';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Label } from '@/ui/primitives/label';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { RadioGroup, RadioGroupItem } from '@/ui/primitives/radio-group';
import { ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons';

export interface StyledMFASetupProps extends Omit<MFASetupProps, 'render'> {
  /**
   * Optional title for the MFA setup form
   */
  title?: string;
  
  /**
   * Optional description for the MFA setup form
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

// Default available MFA methods
const DEFAULT_MFA_METHODS = [
  { id: 'totp', name: 'Authenticator App', description: 'Use an authenticator app like Google Authenticator' },
  { id: 'email', name: 'Email', description: 'Receive codes via email' },
  { id: 'sms', name: 'SMS', description: 'Receive codes via text message' },
];

export function MFASetup({
  title = 'Set Up Two-Factor Authentication',
  description = 'Add an extra layer of security to your account',
  footer,
  className,
  ...headlessProps
}: StyledMFASetupProps) {
  const [selectedMethod, setSelectedMethod] = React.useState('totp');
  const availableMethods = DEFAULT_MFA_METHODS;

  const handleBackupCodeDownload = (codes: string[]) => {
    const content = codes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackupCodeCopy = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join('\n'));
  };

  return (
    <HeadlessMFASetup
      {...headlessProps}
      render={({
        setupState,
        handleVerifyCode: handleSubmit,
        verificationCode,
        setVerificationCode,
        qrCode: qrCodeUrl,
        secret: secretKey,
        isLoading: isSubmitting,
        errors,
        backupCodes,
      }) => {
        const isSuccess = setupState === 'complete';
        return (
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
                  <h3 className="text-lg font-medium">Two-Factor Authentication Enabled</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Your account is now more secure. You&apos;ll need to enter a verification code when you sign in.
                    </p>
                </div>
                
                {backupCodes && backupCodes.length > 0 && (
                  <div className="w-full mt-6">
                    <h4 className="font-medium mb-2">Backup Codes</h4>
                    <p className="text-sm text-gray-500 mb-4">
                      Save these backup codes in a secure place. You can use them to sign in if you lose access to your authentication device.
                    </p>
                    <div className="bg-gray-100 p-4 rounded-md font-mono text-sm mb-4">
                      <div className="grid grid-cols-2 gap-2">
                        {backupCodes.map((code, index) => (
                          <div key={index} className="font-mono">{code}</div>
                        ))}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => backupCodes && handleBackupCodeDownload(backupCodes)}
                        className="text-sm"
                      >
                        Download Codes
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => backupCodes && handleBackupCodeCopy(backupCodes)}
                        className="text-sm"
                      >
                        Copy Codes
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Label>Select Authentication Method</Label>
                  <RadioGroup 
                    value={selectedMethod} 
                    onValueChange={setSelectedMethod}
                    className="space-y-2"
                  >
                    {availableMethods.map((method: { id: string; name: string; description: string }) => (
                      <div key={method.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={method.id} id={method.id} />
                        <Label htmlFor={method.id} className="font-normal">
                          {method.name} - {method.description}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                {selectedMethod === 'totp' && (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center space-y-4">
                      <h3 className="text-lg font-medium">Authenticator App Setup</h3>
                      <p className="text-sm text-center text-gray-500">
                        Scan the QR code with your authenticator app or enter the secret key manually.
                      </p>
                      
                      {qrCodeUrl && (
                        <div className="border p-4 rounded-md bg-white">
                          <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                        </div>
                      )}
                      
                      {secretKey && (
                        <div className="w-full">
                          <Label htmlFor="secretKey">Secret Key</Label>
                          <div className="flex mt-1">
                            <Input
                              id="secretKey"
                              value={secretKey}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="ml-2"
                              onClick={() => navigator.clipboard.writeText(secretKey)}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedMethod === 'email' && (
                  <div className="space-y-4">
                    <Alert>
                      <AlertDescription>
                        A verification code has been sent to your email address. Please check your inbox.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {selectedMethod === 'sms' && (
                  <div className="space-y-4">
                    <Alert>
                      <AlertDescription>
                        A verification code has been sent to your phone number. Please check your messages.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Verification Code</Label>
                  <Input
                    id="verificationCode"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="font-mono text-center text-lg tracking-widest"
                    disabled={isSubmitting}
                  />
                  {errors.verificationCode && (
                    <p className="text-sm text-red-500">{errors.verificationCode}</p>
                  )}
                </div>
                
                {errors.form && (
                  <Alert variant="destructive">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <AlertDescription>{errors.form}</AlertDescription>
                  </Alert>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting || !verificationCode}
                >
                  {isSubmitting ? 'Verifying...' : 'Verify & Enable'}
                </Button>
              </form>
            )}
          </CardContent>
          
          {footer && <CardFooter>{footer}</CardFooter>}
        </Card>
        );
      }}
    />
  );
}
