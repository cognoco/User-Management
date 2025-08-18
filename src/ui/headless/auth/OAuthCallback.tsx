import React, { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';

/**
 * Headless OAuthCallback component that handles behavior only
 * This follows the headless UI pattern from the architecture guidelines
 */
export interface OAuthCallbackProps {
  /**
   * The OAuth provider (e.g., 'google', 'github', 'facebook')
   */
  provider: string;

  /**
   * The callback URL that will receive the OAuth response
   */
  callbackUrl?: string;

  /**
   * Called when OAuth authentication is successful
   */
  onSuccess?: (userData: { 
    id: string; 
    email: string; 
    name?: string; 
    avatarUrl?: string; 
    provider: string 
  }) => void;

  /**
   * Called when OAuth authentication fails
   */
  onError?: (error: string) => void;

  /**
   * Called when OAuth authentication is canceled by the user
   */
  onCancel?: () => void;

  /**
   * Custom loading state (if not provided, internal state is used)
   */
  isLoading?: boolean;

  /**
   * Custom error message (if not provided, internal state is used)
   */
  error?: string;

  /**
   * Render prop function that receives state and handlers
   */
  children: (props: OAuthCallbackRenderProps) => ReactNode;
}

export interface OAuthCallbackRenderProps {
  /**
   * The current status of the OAuth callback process
   */
  status: 'loading' | 'success' | 'error' | 'canceled';

  /**
   * Whether the component is in a loading state
   */
  isLoading: boolean;

  /**
   * Error message, if any
   */
  error?: string;

  /**
   * User data returned from the OAuth provider, if successful
   */
  userData?: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    provider: string;
  };

  /**
   * Retry the OAuth callback process
   */
  retry: () => void;

  /**
   * The OAuth provider
   */
  provider: string;
}

export const OAuthCallback = ({
  provider,
  callbackUrl,
  onSuccess,
  onError,
  onCancel,
  isLoading: externalIsLoading,
  error: externalError,
  children
}: OAuthCallbackProps): React.ReactElement => {
  // Get authentication hook
  const { handleOAuthCallback, isLoading: authIsLoading, error: authError } = useAuth();
  
  // State
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'canceled'>('loading');
  const [userData, setUserData] = useState<{
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    provider: string;
  } | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const error = externalError !== undefined ? externalError : authError;

  // Handle OAuth callback
  const processOAuthCallback = async (): Promise<void> => {
    setIsSubmitting(true);
    setStatus('loading');
    
    try {
      // Get the current URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      
      // Check if the user canceled the OAuth flow
      if (error === 'access_denied' || error === 'user_cancelled_login') {
        setStatus('canceled');
        onCancel?.();
        return;
      }
      
      // Check if we have the required parameters
      if (!code || !state) {
        throw new Error('Missing required OAuth parameters');
      }
      
      // Process the OAuth callback
      const result = await handleOAuthCallback({
        provider,
        code,
        state,
        callbackUrl
      });
      
      if (result.success && result.userData) {
        setUserData(result.userData);
        setStatus('success');
        onSuccess?.(result.userData);
      } else if (result.error) {
        setStatus('error');
        onError?.(result.error);
      }
    } catch (err) {
      setStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to process OAuth callback';
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process the OAuth callback on component mount
  useEffect(() => {
    processOAuthCallback();
  }, [provider, callbackUrl]);

  // Retry the OAuth callback process
  const retry = (): void => {
    processOAuthCallback();
  };
  
  // Prepare render props
  const renderProps: OAuthCallbackRenderProps = {
    status,
    isLoading,
    error,
    userData,
    retry,
    provider
  };
  
  return children(renderProps);
};

export default OAuthCallback;
