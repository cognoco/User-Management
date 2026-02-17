'use client';
import '@/lib/i18n';

import { useEffect, useState } from 'react';
import { toast } from '@/ui/primitives/use-toast';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Skeleton } from '@/ui/primitives/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';

// Import from our new architecture
import { AccountSettings } from '@/ui/styled/profile/AccountSettings';
import { useUserProfile } from '@/hooks/user/useUserProfile';

export default function SettingsPage() {
  const { t } = useTranslation();

  const { profile, isLoading, error } = useUserProfile();

  // Password form local state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const updatePasswordForm = (field: string, value: string) =>
    setPasswordForm((prev) => ({ ...prev, [field]: value }));

  // Delete account local state
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState('');

  // Privacy settings local state
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'private' as 'public' | 'private',
    activityTracking: true,
    communicationEmails: true,
    marketingEmails: false,
  });

  // Security settings local state
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    loginNotifications: true,
    deviceManagement: false,
  });

  useEffect(() => {
    // Show toast if redirected from OAuth linking
    if (typeof window !== 'undefined' && sessionStorage.getItem('show_oauth_linked_toast')) {
      toast({
        title: 'Provider linked!',
        description: 'Your login provider was successfully linked to your account.',
      });
      sessionStorage.removeItem('show_oauth_linked_toast');
    }
  }, []);

  if (isLoading && !profile) {
    return (
      <div className="container mx-auto py-8 space-y-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">
          <Skeleton className="h-8 w-32" />
        </h1>
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="container mx-auto py-8 max-w-3xl">
        <Alert variant="destructive">
          <AlertTitle>Error Loading Settings</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-center md:text-left mb-6">
        {t('settings.title', 'Account Settings')}
      </h1>

      <AccountSettings
        title={t('settings.accountSettings.title', 'Manage Your Account')}
        description={t(
          'settings.accountSettings.description',
          'Update your account settings and preferences',
        )}
        passwordForm={passwordForm}
        updatePasswordForm={updatePasswordForm}
        handlePasswordChange={(e) => {
          e.preventDefault();
          // Password change logic would go here
        }}
        deleteAccountConfirmation={deleteAccountConfirmation}
        updateDeleteConfirmation={setDeleteAccountConfirmation}
        handleDeleteAccount={() => {
          // Delete account logic would go here
        }}
        privacySettings={privacySettings}
        updatePrivacySettings={(field, value) =>
          setPrivacySettings((prev) => ({ ...prev, [field]: value }))
        }
        handlePrivacySettingsChange={(e) => {
          e.preventDefault();
          // Save privacy settings
        }}
        securitySettings={securitySettings}
        updateSecuritySettings={(field, value) =>
          setSecuritySettings((prev) => ({ ...prev, [field]: value }))
        }
        handleSecuritySettingsChange={(e) => {
          e.preventDefault();
          // Save security settings
        }}
        sessions={[]}
        connectedAccounts={[]}
        footer={
          <div className="pt-4 text-center">
            <Link
              href="/docs/PRIVACY_POLICY.md"
              className="text-sm text-muted-foreground underline hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('settings.privacyPolicyLink', 'View Privacy Policy')}
            </Link>
          </div>
        }
      />
    </div>
  );
}
