'use client'; // Required for hooks
import '@/lib/i18n';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/ui/primitives/skeleton';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Button } from '@/ui/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';

// Import from our new architecture
import { ProfileEditor } from '@/ui/styled/profile/ProfileEditor';
import { useUserProfile } from '@/hooks/user/useUserProfile';
import { useAccountSettings } from '@/hooks/user/useAccountSettings';

export default function ProfilePage(): React.ReactElement {
  const { t } = useTranslation();
  
  // Use our hooks from the new architecture
  const { 
    profile, 
    isLoading, 
    error, 
    updateProfile,
    uploadProfilePicture: uploadAvatar,
    deleteProfilePicture: removeAvatar
  } = useUserProfile();
  
  useAccountSettings();

  // Show loading skeleton
  if (isLoading && !profile) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <h1 className="text-2xl font-bold"><Skeleton className="h-8 w-48" /></h1>
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Show error message
  if (error && !profile) {
     return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto space-y-8">
           <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        </div>
      </div>
    );
  }
  
  // Ensure profile is loaded before rendering sections
  if (!profile) {
      return null; // Or a specific "No profile data" message
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-center md:text-left">
          {t('profile.title', 'Manage Your Profile')}
        </h1>
        
        {/* Use our new ProfileEditor component */}
        <ProfileEditor />
        
        {/* Password Change Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.changePassword.title', 'Change Password')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('profile.changePassword.description', 'Update your password to keep your account secure')}
            </p>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/settings'}
            >
              {t('profile.changePassword.goToSettings', 'Manage in Settings')}
            </Button>
          </CardContent>
        </Card>
        
        {/* Account Deletion Section */}
        <Card className="border border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">
              {t('profile.deleteAccount.title', 'Delete Account')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('profile.deleteAccount.warning', 'Permanently delete your account and all associated data. This action cannot be undone.')}
            </p>
            <Button 
              variant="destructive"
              onClick={() => window.location.href = '/settings'}
            >
              {t('profile.deleteAccount.goToSettings', 'Manage in Settings')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}