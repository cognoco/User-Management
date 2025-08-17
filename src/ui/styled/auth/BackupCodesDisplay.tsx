import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/primitives/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import BackupCodesDisplayHeadless from '@/ui/headless/auth/BackupCodesDisplay';

interface BackupCodesDisplayProps {
  existingCodes?: string[];
  showRegenerateOption?: boolean;
  onClose?: () => void;
}

export function BackupCodesDisplay({ 
  existingCodes = [], 
  showRegenerateOption = true,
  onClose 
}: BackupCodesDisplayProps): React.ReactElement {
  const { t } = useTranslation();
  const [regenerateConfirmVisible, setRegenerateConfirmVisible] = useState(false);

  return (
    <BackupCodesDisplayHeadless
      codes={existingCodes}
      render={({ 
        codes,
        handleGenerateNewCodes,
        handleDownload,
        handleCopy,
        isCopied,
        isLoading,
        error
      }) => (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('2fa.backupCodes.title')}</CardTitle>
            <CardDescription>
              {t('2fa.backupCodes.description')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {!regenerateConfirmVisible ? (
              <>
                <Alert className="mb-4" role="alert">
                  <AlertDescription>
                    {t('2fa.backupCodes.saveWarning')}
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-2">
                  {codes.map((code, index) => (
                    <div key={index} className="font-mono text-sm p-2 bg-muted rounded">
                      {code}
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={handleCopy} size="sm">
                    {isCopied ? t('common.copied') : t('common.copy')}
                  </Button>
                  <Button variant="outline" onClick={handleDownload} size="sm">
                    {t('common.download')}
                  </Button>
                  
                  {showRegenerateOption && (
                    <Button 
                      variant="destructive" 
                      onClick={() => setRegenerateConfirmVisible(true)}
                      size="sm"
                      className="ml-auto"
                    >
                      {t('2fa.backupCodes.regenerate')}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive" role="alert">
                  <AlertDescription>
                    {t('2fa.backupCodes.regenerateWarning')}
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      handleGenerateNewCodes();
                      setRegenerateConfirmVisible(false);
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? t('common.loading') : t('2fa.backupCodes.confirmRegenerate')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setRegenerateConfirmVisible(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter>
            {onClose && (
              <Button className="w-full" onClick={onClose}>
                {t('common.close')}
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    />
  );
}