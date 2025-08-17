'use client';

import React, { useState } from 'react';
import { Button } from '@/ui/primitives/button';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Card, CardContent } from '@/ui/primitives/card';
import { Shield, CheckCircle2 } from 'lucide-react';

interface WebAuthnRegistrationProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function WebAuthnRegistration({ onSuccess, onError }: WebAuthnRegistrationProps): React.ReactElement {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (): Promise<void> => {
    try {
      setIsRegistering(true);
      setError(null);
      
      // Simulated WebAuthn registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-lg font-semibold">Security Key Registered!</h3>
            <p className="text-sm text-muted-foreground">
              Your security key has been successfully registered and can now be used for authentication.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <Shield className="h-16 w-16 text-blue-500 mx-auto" />
            <h3 className="text-lg font-semibold">Register Security Key</h3>
            <p className="text-sm text-muted-foreground">
              Add a security key to your account for enhanced protection
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-center">
            <Button
              onClick={handleRegister}
              disabled={isRegistering}
              className="w-full"
            >
              {isRegistering ? (
                <>
                  <Shield className="h-5 w-5" />
                  Registering...
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  Register Security Key
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>
              You&apos;ll be prompted to interact with your security key during registration.
              Make sure your security key is connected and ready.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WebAuthnRegistration;
