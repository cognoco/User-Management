'use client';
import '@/lib/i18n';

import { useEffect } from 'react';
import { toast } from '@/ui/primitives/use-toast';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Skeleton } from '@/ui/primitives/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';

// Import from our new architecture
import { AccountSettings } from '@/ui/styled/profile/AccountSettings';
import { useAccountSettings } from '@/hooks/user/useAccountSettings';
import { useUserProfile } from '@/hooks/user/useUserProfile';

export default function SettingsPage() {
  const { t } = useTranslation();
  
  // Use our hooks from the new architecture
  const { 
    profile, 
    isLoading, 
    error 
  } = useUserProfile();
  
  const {
    passwordForm,
    updatePasswordForm,
    changePassword,
    deleteAccountConfirmation,
    updateDeleteConfirmation,
    deleteAccount,
    privacySettings,
    updatePrivacySettings,
    securitySettings,
    updateSecuritySettings,
    sessions,
    logoutSession,
    connectedAccounts,
    disconnectAccount,
    connectAccount,
    exportUserData
  } = useAccountSettings();

  useEffect(() => {
    // Show toast if redirected from OAuth linking
    // Using URL parameters instead of sessionStorage for security
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('oauth_linked') === 'true') {
        toast({
          title: 'Provider linked!',
        description: 'Your login provider was successfully linked to your account.',
      });
        // Clear the URL parameter after showing toast
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  if (isLoading && !profile) {
    return (
      <div className="container mx-auto py-8 space-y-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6"><Skeleton className="h-8 w-32" /></h1>
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
      
      {/* Use our new AccountSettings component */}
      <AccountSettings
        title={t('settings.accountSettings.title', 'Manage Your Account')}
        description={t('settings.accountSettings.description', 'Update your account settings and preferences')}
        // Pass all the necessary props from our hooks
        passwordForm={passwordForm}
        updatePasswordForm={updatePasswordForm}
        handlePasswordChange={changePassword}
        deleteAccountConfirmation={deleteAccountConfirmation}
        updateDeleteConfirmation={updateDeleteConfirmation}
        handleDeleteAccount={deleteAccount}
        privacySettings={privacySettings}
        handlePrivacySettingsChange={updatePrivacySettings}
        securitySettings={securitySettings}
        handleSecuritySettingsChange={updateSecuritySettings}
        sessions={sessions}
        handleSessionLogout={logoutSession}
        connectedAccounts={connectedAccounts}
        handleDisconnectAccount={disconnectAccount}
        handleConnectAccount={connectAccount}
        exportData={exportUserData}
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