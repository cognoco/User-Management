'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { getUserHomePage } from '@/lib/utils/getUserHomePage';
import { useOAuthStore } from '@/lib/stores/oauth.store';
import { OAuthProvider } from '@/types/oauth';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Spinner } from '@/ui/primitives/spinner';

export function OAuthCallback(): React.ReactElement {
  const { t } = useTranslation();
  const { handleCallback, error } = useOAuthStore();
  const { user } = useAuth();
  const [processingState, setProcessingState] = useState<'initial' | 'processing' | 'error' | 'success'>('initial');
  
  useEffect(() => {
    const processCallback = async () => {
      try {
        setProcessingState('processing');
        
        // Get query parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const provider = urlParams.get('provider') as OAuthProvider;
        const error = urlParams.get('error');
        
        // Handle error from OAuth provider
        if (error) {
          if (process.env.NODE_ENV === 'development') { console.error(`Provider error: ${error}`); }
          throw new Error(`Provider error: ${error}`);
        }
        
        // Validate required parameters
        if (!code) {
          if (process.env.NODE_ENV === 'development') { console.error('Authorization code is missing'); }
          throw new Error('Authorization code is missing');
        }
        
        if (!provider) {
          if (process.env.NODE_ENV === 'development') { console.error('Provider is missing'); }
          throw new Error('Provider is missing');
        }
        
        // Process the callback
        await handleCallback(provider, code);
        setProcessingState('success');
        // Determine homepage
        const homepage = user ? getUserHomePage(user) : '/dashboard/overview';
        // Show toast on next page load (using sessionStorage as a cross-page flag)
        sessionStorage.setItem('show_oauth_linked_toast', '1');
        // Redirect
        window.location.replace(homepage);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') { console.error('OAuth callback error:', error); }
        setProcessingState('error');
      }
    };
    
    processCallback();
  }, [handleCallback]);
  
  // Render loading state
  if (processingState === 'initial' || processingState === 'processing') {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>{t('oauth.callback.title')}</CardTitle>
          <CardDescription>{t('oauth.callback.processing')}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    );
  }
  
  // Render error state
  if (processingState === 'error' || error) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>{t('oauth.callback.errorTitle')}</CardTitle>
          <CardDescription>{t('oauth.callback.errorDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error || t('oauth.callback.genericError')}</AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <a href="/auth/login" className="text-primary hover:underline">
              {t('oauth.callback.backToLogin')}
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Success state (should redirect, but just in case)
  return null; // No UI, as we redirect immediately

} 