// src/components/shared/ConnectedAccounts.tsx
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConnectedAccountsStore } from '@/lib/stores/connected-accounts.store';
import { OAuthProvider } from '@/types/oauth';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { Alert } from '@/ui/primitives/alert';
import { getPlatformClasses } from '@/hooks/utils/usePlatformStyles';
import { useUserManagement } from '@/lib/auth/UserManagementProvider';
import { ConnectedAccount } from '@/types/connected-accounts';
import { 
  Github, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Mail, 
  Trash2,
  Loader2
} from 'lucide-react';

const PROVIDER_ICONS = {
  [OAuthProvider.GOOGLE]: Mail,
  [OAuthProvider.GITHUB]: Github,
  [OAuthProvider.FACEBOOK]: Facebook,
  [OAuthProvider.TWITTER]: Twitter,
  [OAuthProvider.LINKEDIN]: Linkedin,
  [OAuthProvider.MICROSOFT]: Mail,
  [OAuthProvider.APPLE]: Mail,
};

const PROVIDER_LABELS = {
  [OAuthProvider.GOOGLE]: 'Google',
  [OAuthProvider.GITHUB]: 'GitHub',
  [OAuthProvider.FACEBOOK]: 'Facebook',
  [OAuthProvider.TWITTER]: 'Twitter',
  [OAuthProvider.LINKEDIN]: 'LinkedIn',
  [OAuthProvider.MICROSOFT]: 'Microsoft',
  [OAuthProvider.APPLE]: 'Apple',
};

interface ConnectedAccountsProps {
  variant?: 'settings' | 'profile';
  showHeader?: boolean;
  className?: string;
}

export function ConnectedAccounts({ 
  variant = 'settings', 
  showHeader = true,
  className = ''
}: ConnectedAccountsProps) {
  const { t } = useTranslation();
  const { accounts, isLoading, error, fetchConnectedAccounts, connectAccount, disconnectAccount } = useConnectedAccountsStore();
  const { platform, isNative } = useUserManagement();
  const platformInfo = { platform, isNative };

  useEffect(() => {
    fetchConnectedAccounts();
  }, [fetchConnectedAccounts]);

  const containerClasses = getPlatformClasses({
    base: `space-y-4 ${className}`,
    mobile: "px-2"
  }, platformInfo);

  const cardClasses = getPlatformClasses({
    base: "bg-card rounded-lg shadow",
    mobile: "rounded-md"
  }, platformInfo);

  const handleConnect = async (provider: OAuthProvider) => {
    await connectAccount(provider);
  };

  const handleDisconnect = async (accountId: string) => {
    await disconnectAccount(accountId);
  };

  // Profile variant has a simplified UI
  if (variant === 'profile') {
    return (
      <div className={containerClasses}>
        {error && (
          <Alert variant="destructive" className="mb-4" role="alert">
            {error}
          </Alert>
        )}

        <div className="space-y-4">
          {/* Connected Accounts List */}
          {accounts.map((account: ConnectedAccount) => {
            const Icon = PROVIDER_ICONS[account.provider];
            return (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <Icon className="h-5 w-5" />
                  <p className="font-medium">{PROVIDER_LABELS[account.provider]}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect(account.id)}
                  disabled={isLoading}
                  aria-label={`Disconnect ${PROVIDER_LABELS[account.provider]} account`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          {/* Connect New Account */}
          <div className="grid grid-cols-2 gap-2">
            {Object.values(OAuthProvider).map((provider) => {
              const Icon = PROVIDER_ICONS[provider];
              const isConnected = accounts.some(
                (account: ConnectedAccount) => account.provider === provider
              );
              
              return (
                <Button
                  key={provider}
                  variant="outline"
                  className="flex items-center justify-start space-x-2"
                  onClick={() => handleConnect(provider)}
                  disabled={isLoading || isConnected}
                  size="sm"
                  aria-label={`Connect ${PROVIDER_LABELS[provider]} account`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{PROVIDER_LABELS[provider]}</span>
                  {isLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Settings variant - more detailed UI with card
  return (
    <div className={containerClasses}>
      <Card className={cardClasses}>
        {showHeader && (
          <CardHeader>
            <CardTitle>{t('settings.connectedAccounts.title')}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4" role="alert">
              {error}
            </Alert>
          )}

          <div className="space-y-4">
            {/* Connected Accounts List */}
            {accounts.map((account: ConnectedAccount) => {
              const Icon = PROVIDER_ICONS[account.provider];
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-6 w-6" />
                    <div>
                      <p className="font-medium">{PROVIDER_LABELS[account.provider]}</p>
                      <p className="text-sm text-muted-foreground">{account.providerEmail}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDisconnect(account.id)}
                    disabled={isLoading}
                    aria-label={`Disconnect ${PROVIDER_LABELS[account.provider]} account`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            {/* Connect New Account */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-3">
                {t('settings.connectedAccounts.connectNew')}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.values(OAuthProvider).map((provider) => {
                  const Icon = PROVIDER_ICONS[provider];
                  const isConnected = accounts.some(
                    (account: ConnectedAccount) => account.provider === provider
                  );
                  
                  return (
                    <Button
                      key={provider}
                      variant="outline"
                      className="flex items-center space-x-2"
                      onClick={() => handleConnect(provider)}
                      disabled={isLoading || isConnected}
                      aria-label={`Connect ${PROVIDER_LABELS[provider]} account`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{PROVIDER_LABELS[provider]}</span>
                      {isLoading && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
