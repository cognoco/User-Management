'use client';
import { useState } from 'react';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Card } from '@/ui/primitives/card';
import { TwoFactorSetup as HeadlessTwoFactorSetup } from '@/ui/headless/two-factor/TwoFactorSetup';
import QRCodeDisplay from './QRCodeDisplay';
import BackupCodesList from './BackupCodesList';
import { WebAuthnRegistration } from './WebAuthnRegistration';

export function TwoFactorSetup(): React.ReactElement {
  const [code, setCode] = useState('');
  return (
    <HeadlessTwoFactorSetup
      onComplete={() => setCode('')}
    >
      {({ step, secret, qrCode, backupCodes, start, verify, cancel, loading, error }) => (
        <Card className="p-4 space-y-4 w-full max-w-md">
          {step === 'initial' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Choose a 2FA Method</h2>
              <Button onClick={start} disabled={loading} className="w-full">
                Enable Two-Factor Authentication
              </Button>
              <div className="border p-4 rounded-md">
                <WebAuthnRegistration />
              </div>
            </div>
          )}
          {step === 'verify' && (
            <div className="space-y-4">
              <QRCodeDisplay qrCode={qrCode} secret={secret} />
              <Input
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
              />
              <div className="flex gap-2">
                <Button onClick={() => verify(code)} disabled={loading || code.length !== 6}>
                  Verify
                </Button>
                <Button variant="outline" onClick={cancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {step === 'complete' && backupCodes && <BackupCodesList codes={backupCodes} />}
          {error && <p className="text-destructive text-sm">{error}</p>}
        </Card>
      )}
    </HeadlessTwoFactorSetup>
  );
}

export default TwoFactorSetup;
