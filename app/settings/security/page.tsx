'use client';
import '@/lib/i18n';

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';

// Import from our new architecture
import MFAManagementSection from '@/ui/styled/auth/MFAManagementSection';

export default function SecuritySettingsPage() {
  const { t } = useTranslation();
  

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-center md:text-left">
          {t('security.title', 'Security Settings')}
        </h1>
        
        <MFAManagementSection />
        
        {/* Password Security Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('security.password.title', 'Password Security')}</CardTitle>
            <CardDescription>
              {t('security.password.description', 'Manage your password and account security')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('security.password.lastChanged', 'Your password was last changed on:')} {new Date().toLocaleDateString()}
            </p>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/settings/activity'}
            >
              {t('security.password.change', 'Change Password')}
            </Button>
          </CardContent>
        </Card>
        
        {/* Recent Activity Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('security.activity.title', 'Recent Activity')}</CardTitle>
            <CardDescription>
              {t('security.activity.description', 'Monitor recent sign-ins to your account')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('security.activity.viewAll', 'View all activity in your account settings')}
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.href = '/settings'}
            >
              {t('security.activity.goToSettings', 'View in Settings')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

