/**
 * Headless OAuth Buttons Component
 * 
 * This component handles the behavior of OAuth authentication buttons without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import React, { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';

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
}: OAuthButtonsProps): React.ReactElement => {
  // Get authentication hook
  const { getOAuthProviders, signInWithOAuth, isLoading: authIsLoading, error: authError } = useAuth();
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : authError || error;
  
  // Get available providers
  const providers = customProviders || getOAuthProviders();
  
  // Handle provider click
  const handleProviderClick = async (providerId: string): Promise<void> => {
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
