'use client';

import React, { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { Button } from '@/ui/primitives/button';
import { Alert, AlertDescription } from '@/ui/primitives/alert';

interface WebAuthnLoginProps {
  userId: string;
  onSuccess: (userData: unknown) => void;
}

export function WebAuthnLogin({ userId, onSuccess }: WebAuthnLoginProps): React.ReactElement {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthenticate = async (): Promise<void> => {
    setIsAuthenticating(true);
    setError(null);
    try {
      // Step 1: Get authentication options from server
      const optionsRes = await fetch('/api/2fa/webauthn/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'options',
          userId
        })
      });

      if (!optionsRes.ok) {
        const errorData = await optionsRes.json();
        throw new Error(errorData.error || 'Failed to start authentication');
      }

      const options = await optionsRes.json();

      // Step 2: Authenticate with device
      const credential = await startAuthentication(options);

      // Step 3: Verify with server
      const verifyRes = await fetch('/api/2fa/webauthn/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'verification',
          credential,
          userId
        })
      });

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      const userData = await verifyRes.json();
      onSuccess(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      console.error(err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleAuthenticate}
        disabled={isAuthenticating}
        variant="outline"
        className="w-full"
        size="lg"
      >
        {isAuthenticating ? 'Authenticating...' : 'Use Security Key or Biometrics'}
      </Button>
    </div>
  );
}

export default WebAuthnLogin;
