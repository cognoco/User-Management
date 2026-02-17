/**
 * Headless OAuth Buttons Component
 * 
 * This component handles the behavior of OAuth authentication buttons without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { api } from '@/lib/api/axios';

export interface OAuthProvider {
  id: string;
  name: string;
  icon?: string;
}

export interface OAuthButtonsProps {
  /**
   * Callback when a provider is selected
   */
  onProviderSelect?: (providerId: string) => void;
  
  /**
   * Custom providers (if not provided, available providers from auth service are used)
   */
  customProviders?: OAuthProvider[];
  
  /**
   * Custom loading state (if not provided, internal state is used)
   */
  isLoading?: boolean;
  
  /**
   * Custom error message (if not provided, internal state is used)
   */
  error?: string;
  
  /**
   * Render prop function that receives OAuth providers and handlers
   */
  render: (props: {
    providers: OAuthProvider[];
    handleProviderClick: (providerId: string) => void;
    isLoading: boolean;
    error?: string;
  }) => React.ReactNode;
}

export function OAuthButtons({
  onProviderSelect,
  customProviders,
  isLoading: externalIsLoading,
  error: externalError,
  render
}: OAuthButtonsProps) {
  // Get authentication hook
  const { isLoading: authIsLoading, error: authError } = useAuth();

  // OAuth API helpers (not yet in useAuth)
  const getOAuthProviders = async (): Promise<{ id: string; name: string; icon?: string }[]> => {
    const res = await api.get('/auth/oauth/providers');
    return res.data;
  };

  const signInWithOAuth = async (providerId: string): Promise<{ success: boolean; redirectUrl?: string; error?: string }> => {
    const res = await api.post('/auth/oauth/initiate', { providerId });
    return res.data;
  };
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loadedProviders, setLoadedProviders] = useState<OAuthProvider[]>([]);
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const formError: string | undefined = externalError !== undefined ? externalError : (authError ?? error ?? undefined);
  
  // Get available providers (async)
  const providers: OAuthProvider[] = customProviders ?? loadedProviders;

  useEffect(() => {
    if (!customProviders) {
      getOAuthProviders().then((ps) => setLoadedProviders(ps as OAuthProvider[])).catch(() => {});
    }
  }, []);
  
  // Handle provider click
  const handleProviderClick = async (providerId: string) => {
    setError(undefined);
    setIsSubmitting(true);
    
    try {
      // Notify parent
      onProviderSelect?.(providerId);
      
      // Sign in with provider
      const result = await signInWithOAuth(providerId);
      
      if (result.error) {
        setError(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OAuth authentication failed';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render the component using the render prop
  return render({
    providers,
    handleProviderClick,
    isLoading,
    error: formError
  });
}

export default OAuthButtons;
