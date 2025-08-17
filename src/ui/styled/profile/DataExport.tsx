import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { DataExport as DataExportHeadless } from '@/ui/headless/settings/DataExport';

export default function DataExport(): React.ReactElement {
  const { t } = useTranslation();
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <DataExportHeadless
      onComplete={() =>
        setSuccess(
          t(
            'profile.dataExport.success',
            'Your data export has been downloaded successfully.'
          )
        )
      }
      render={({ isLoading, error, handleExport }) => (
        <Card className="rounded border p-4 max-w-lg mx-auto bg-white shadow mt-6">
          <CardHeader>
            <CardTitle>{t('profile.dataExport.title', 'Export Your Data')}</CardTitle>
            <CardDescription>
              {t('profile.dataExport.description', 'Download a copy of your profile information, account settings, and activity log.')}
            </CardDescription>
          </CardHeader>
          {error && (
            <CardContent>
              <Alert variant="destructive" role="alert">
                <AlertDescription>
                  {t('profile.dataExport.error', error)}
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
          {success && (
            <CardContent>
              <Alert role="status">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            </CardContent>
          )}
          <CardFooter>
            <Button onClick={handleExport} disabled={isLoading} {...(isLoading ? { role: 'status' } : {})}>
              {isLoading ? t('profile.dataExport.generating', 'Generating export...') : t('profile.dataExport.button', 'Download My Data')}
            </Button>
          </CardFooter>
        </Card>
      )}
    />
  );
}
