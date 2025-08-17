import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/ui/primitives/dialog';
import { OAUTH_PROVIDERS } from '@/lib/constants/oauthProviders';
import { useLinkedProviders, useLinkProvider, useUnlinkProvider } from '@/lib/hooks/useProviderManagement';
import { OAuthProvider } from '@/types/oauth';
import { Button } from '@/ui/primitives/button';
import { toast } from '@/lib/hooks/use-toast';

const ALL_PROVIDERS: OAuthProvider[] = [
  OAuthProvider.GOOGLE,
  OAuthProvider.GITHUB,
  OAuthProvider.MICROSOFT,
  OAuthProvider.APPLE,
  OAuthProvider.LINKEDIN,
  OAuthProvider.FACEBOOK,
  OAuthProvider.TWITTER,
];

export function ProviderManagementPanel(): React.ReactElement {
  const { linkedProviders, loading: loadingLinked, error: errorLinked, fetchLinkedProviders } = useLinkedProviders();
  const { loading: linking, error: errorLink } = useLinkProvider();
  const { unlinkProvider, loading: unlinking, error: errorUnlink } = useUnlinkProvider();
  const [selectedProvider, setSelectedProvider] = useState<OAuthProvider | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchLinkedProviders();
  }, [fetchLinkedProviders]);

  const handleLink = async (provider: OAuthProvider) => {
    setSelectedProvider(provider);
    try {
      // Request the OAuth authorization URL from the backend
      const res = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error('Failed to initiate OAuth flow');
      const data = await res.json();
      if (!data.url) throw new Error('No authorization URL returned');
      // Redirect to the provider's authorization URL
      window.location.href = data.url;
    } catch (err: any) {
      toast({
        title: `Failed to start ${provider} login`,
        description: err.message || '',
        variant: 'destructive',
      });
    } finally {
      setSelectedProvider(null);
    }
  };


  const handleUnlink = async (provider: OAuthProvider) => {
    setSelectedProvider(provider);
    setShowConfirm(true);
  };

  const confirmUnlink = async () => {
    if (!selectedProvider) return;
    try {
      await unlinkProvider(selectedProvider);
      toast({
        title: `${selectedProvider} unlinked successfully!`,
        description: `${selectedProvider} has been removed from your account.`,
      });
      fetchLinkedProviders();
    } catch (err: any) {
      toast({
        title: `Failed to unlink ${selectedProvider}`,
        description: err.message || '',
        variant: 'destructive',
      });
    } finally {
      setSelectedProvider(null);
      setShowConfirm(false);
    }
  };

  const cancelUnlink = () => {
    setSelectedProvider(null);
    setShowConfirm(false);
  };

  const isLastProvider = linkedProviders.length === 1;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Linked Login Providers</h2>
      {loadingLinked && <div>Loading providers...</div>}
      {errorLinked && <div className="text-red-500">{errorLinked}</div>}

      <ul className="mb-4">
        {ALL_PROVIDERS.map((provider) => {
          const isLinked = linkedProviders.includes(provider.toLowerCase());
          return (
            <li key={provider} className="flex items-center gap-2 mb-2">
              {/* Show icon and label from OAUTH_PROVIDERS mapping */}
              {(() => {
                const info = OAUTH_PROVIDERS[provider.toLowerCase()] || { label: provider.toLowerCase() };
                return (
                  <span className="flex items-center gap-2">
                    {info.icon && (
                      <img src={info.icon} alt={info.label} className="w-5 h-5" />
                    )}
                    <span>{info.label}</span>
                  </span>
                );
              })()}
              {isLinked ? (
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={unlinking || isLastProvider}
                    onClick={() => handleUnlink(provider)}
                  >
                    {unlinking && selectedProvider === provider ? 'Unlinking...' : 'Unlink'}
                  </Button>
                </DialogTrigger>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  disabled={linking}
                  onClick={() => handleLink(provider)}
                >
                  {linking && selectedProvider === provider ? 'Linking...' : 'Link'}
                </Button>
              )}
              {isLinked && isLastProvider && (
                <span className="text-xs text-yellow-600 ml-2">(Cannot unlink last provider)</span>
              )}
            </li>
          );
        })}
      </ul>
      {errorLink && <div className="text-red-500">{errorLink}</div>}
      {errorUnlink && <div className="text-red-500">{errorUnlink}</div>}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink Provider</DialogTitle>
            <DialogDescription>
              {isLastProvider ? (
                <span className="text-yellow-700">
                  You are about to unlink your <b>last login provider</b>. This may result in losing access to your account unless you have another way to log in (such as a password).<br />
                  <b>This action is not allowed.</b>
                </span>
              ) : (
                <span>
                  Are you sure you want to unlink <b>{selectedProvider && OAUTH_PROVIDERS[selectedProvider.toLowerCase()]?.label}</b>?<br />
                  You may not be able to log in with this provider again unless you re-link it.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" onClick={cancelUnlink}>Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={confirmUnlink}
              disabled={isLastProvider || unlinking}
            >
              {unlinking ? 'Unlinking...' : 'Unlink'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 