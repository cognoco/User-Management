'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { TwoFactorSetup as HeadlessTwoFactorSetup } from '@/ui/headless/auth/TwoFactorSetup';
import { Button } from '@/ui/primitives/button';
import { Card } from '@/ui/primitives/card';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { Alert, AlertDescription } from '@/ui/primitives/alert';

interface TwoFactorSetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps): React.ReactElement {
  const { t } = useTranslation();
  const [verificationCode, setVerificationCode] = useState('');

  const copyCodes = (codes: string[]): void => {
    navigator.clipboard.writeText(codes.join('\n')).catch(() => {});
  };

  const downloadCodes = (codes: string[]): void => {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <HeadlessTwoFactorSetup
      onSetupComplete={onComplete}
      onCancel={onCancel}
      render={({
        setupStage,
        handleMethodChange,
        handleStartSetup,
        handleVerify,
        handleCancel,
        isLoading,
        error,
        qrCode,
        secret,
        backupCodes
      }) => (
        <Card className="w-full max-w-md p-6">
          <h2 className="text-2xl font-bold mb-6">{t('2fa.setup.title')}</h2>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {setupStage === 'method-selection' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('2fa.setup.selectMethod')}</h3>
              <div className="grid gap-4">
                <Button variant="outline" onClick={() => { handleMethodChange('app'); handleStartSetup(); }} disabled={isLoading}>
                  {t('2fa.methods.totp')}
                </Button>
                <Button variant="outline" onClick={() => { handleMethodChange('sms'); handleStartSetup(); }} disabled={isLoading}>
                  {t('2fa.methods.sms')}
                </Button>
                <Button variant="outline" onClick={() => { handleMethodChange('email'); handleStartSetup(); }} disabled={isLoading}>
                  {t('2fa.methods.email')}
                </Button>
              </div>
            </div>
          )}

          {setupStage === 'setup' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('2fa.setup.verify')}</h3>
              {qrCode && (
                <div className="flex flex-col items-center mb-4">
                  <Image src={qrCode} alt="QR Code" width={192} height={192} className="mb-2 w-48 h-48" />
                  {secret && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">{t('2fa.setup.manualCode')}</p>
                      <code className="px-2 py-1 bg-muted rounded text-sm">{secret}</code>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="code">{t('2fa.setup.enterCode')}</Label>
                <Input
                  id="code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    const ok = await handleVerify(verificationCode);
                    if (ok) setVerificationCode('');
                  }}
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  {t('2fa.setup.verify')}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  {t('common.back')}
                </Button>
              </div>
            </div>
          )}

          {setupStage === 'complete' && backupCodes && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('2fa.setup.backupCodes')}</h3>
              <Alert>
                <AlertDescription>{t('2fa.setup.saveBackupCodes')}</AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <div key={index} className="font-mono text-sm p-2 bg-muted rounded">
                    {code}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => copyCodes(backupCodes)}>
                  {t('common.copy')}
                </Button>
                <Button variant="outline" onClick={() => downloadCodes(backupCodes)}>
                  {t('common.download')}
                </Button>
              </div>
              {onComplete && (
                <Button onClick={onComplete}>{t('2fa.setup.complete')}</Button>
              )}
            </div>
          )}
        </Card>
      )}
    />
  );
}
