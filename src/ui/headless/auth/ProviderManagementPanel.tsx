import { ReactNode, useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { api } from '@/lib/api/axios';

/**
 * Headless ProviderManagementPanel component that handles behavior only
 * This follows the headless UI pattern from the architecture guidelines
 */
export interface ProviderManagementPanelProps {
  /**
   * User ID for which to manage authentication providers
   */
  userId?: string;

  /**
   * Called when a provider is successfully linked
   */
  onProviderLinked?: (provider: string) => void;

  /**
   * Called when a provider is successfully unlinked
   */
  onProviderUnlinked?: (provider: string) => void;

  /**
   * Called when an error occurs
   */
  onError?: (error: string) => void;

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
  children: (props: ProviderManagementPanelRenderProps) => ReactNode;
}

export interface AuthProvider {
  id: string;
  type: 'password' | 'oauth' | 'saml' | 'email' | 'phone';
  provider: string;
  providerName: string;
  providerIcon?: string;
  isLinked: boolean;
  isPrimary: boolean;
  email?: string;
  lastUsed?: Date;
  createdAt: Date;
}

export interface ProviderManagementPanelRenderProps {
  /**
   * Currently linked authentication providers
   */
  linkedProviders: AuthProvider[];

  /**
   * Available authentication providers that can be linked
   */
  availableProviders: Array<{
    id: string;
    name: string;
    icon?: string;
    canLink: boolean;
  }>;

  /**
   * Start the linking process for a new provider
   */
  startLinking: (providerId: string) => void;

  /**
   * Unlink an existing provider
   */
  unlinkProvider: (providerId: string) => Promise<boolean>;

  /**
   * Set a provider as primary
   */
  setPrimaryProvider: (providerId: string) => Promise<boolean>;

  /**
   * Current linking state
   */
  linkingState: {
    isActive: boolean;
    providerId: string | null;
    step: 'initial' | 'verification' | 'complete';
  };

  /**
   * Cancel the current linking process
   */
  cancelLinking: () => void;

  /**
   * Whether the component is in a loading state
   */
  isLoading: boolean;

  /**
   * Error message, if any
   */
  error?: string;

  /**
   * Refresh providers
   */
  refreshProviders: () => Promise<void>;

  /**
   * Email for email verification during linking
   */
  verificationEmail: string;

  /**
   * Set email for verification
   */
  setVerificationEmail: (email: string) => void;

  /**
   * Handle verification form submission
   */
  handleVerificationSubmit: (e: FormEvent) => void;

  /**
   * Whether the current user has a password set
   */
  hasPassword: boolean;
}

export const ProviderManagementPanel = ({
  userId,
  onProviderLinked,
  onProviderUnlinked,
  onError,
  isLoading: externalIsLoading,
  error: externalError,
  children
}: ProviderManagementPanelProps) => {
  // Get authentication hook — only use what exists in UseAuth
  const { isLoading: authIsLoading, error: authError } = useAuth();

  // Provider management API helpers (not yet in useAuth)
  const getUserAuthProviders = async (uid?: string): Promise<AuthProvider[]> => {
    const path = uid ? `/users/${uid}/auth-providers` : '/auth/providers/linked';
    const res = await api.get(path);
    return res.data;
  };

  const getAvailableAuthProviders = async (): Promise<Array<{ id: string; name: string; icon?: string; canLink: boolean }>> => {
    const res = await api.get('/auth/providers/available');
    return res.data;
  };

  const linkAuthProvider = async (params: { userId?: string; providerId: string; action: string }): Promise<{ success: boolean; redirectUrl?: string; error?: string }> => {
    const res = await api.post('/auth/providers/link', params);
    return res.data;
  };

  const unlinkAuthProvider = async (params: { userId?: string; providerId: string }): Promise<{ success: boolean; error?: string }> => {
    const res = await api.delete('/auth/providers/link', { data: params });
    return res.data;
  };

  const setPrimaryAuthProvider = async (params: { userId?: string; providerId: string }): Promise<{ success: boolean; error?: string }> => {
    const res = await api.put('/auth/providers/primary', params);
    return res.data;
  };

  const verifyProviderEmail = async (params: { userId?: string; providerId: string; email: string }): Promise<{ success: boolean; error?: string }> => {
    const res = await api.post('/auth/providers/verify-email', params);
    return res.data;
  };
  
  // State
  const [linkedProviders, setLinkedProviders] = useState<AuthProvider[]>([]);
  const [availableProviders, setAvailableProviders] = useState<Array<{
    id: string;
    name: string;
    icon?: string;
    canLink: boolean;
  }>>([]);
  const [linkingState, setLinkingState] = useState({
    isActive: false,
    providerId: null as string | null,
    step: 'initial' as 'initial' | 'verification' | 'complete'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [hasPassword, setHasPassword] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const error = externalError !== undefined ? externalError : (authError ?? undefined);

  // Load authentication providers
  const loadAuthProviders = async () => {
    setIsSubmitting(true);
    
    try {
      // Get user's linked authentication providers
      const providers = await getUserAuthProviders(userId);
      setLinkedProviders(providers);
      setHasPassword(providers.some(p => p.type === 'password'));
      
      // Get available authentication providers
      const available = await getAvailableAuthProviders();
      
      // Filter out already linked providers
      const linkedProviderIds = providers.map(p => p.provider);
      const filteredAvailable = available.filter(p => !linkedProviderIds.includes(p.id));
      
      setAvailableProviders(filteredAvailable);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load authentication providers';
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load authentication providers on component mount
  useEffect(() => {
    loadAuthProviders();
  }, [userId]);

  // Start linking process for a new provider
  const startLinking = (providerId: string) => {
    const provider = availableProviders.find(p => p.id === providerId);
    
    if (!provider) return;
    
    // Email providers require verification first
    if (providerId === 'email') {
      setLinkingState({
        isActive: true,
        providerId,
        step: 'verification'
      });
    } else {
      // OAuth providers initiate the OAuth flow
      initiateOAuthLinking(providerId);
    }
  };

  // Initiate OAuth linking
  const initiateOAuthLinking = async (providerId: string) => {
    setIsSubmitting(true);
    
    try {
      const result = await linkAuthProvider({
        userId,
        providerId,
        action: 'initiate'
      });
      
      if (result.success && result.redirectUrl) {
        // Redirect to the OAuth provider's authorization page
        window.location.href = result.redirectUrl;
      } else if (result.error) {
        onError?.(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate provider linking';
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle verification form submission
  const handleVerificationSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!linkingState.providerId || !verificationEmail.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const result = await verifyProviderEmail({
        userId,
        providerId: linkingState.providerId,
        email: verificationEmail
      });
      
      if (result.success) {
        setLinkingState({
          ...linkingState,
          step: 'complete'
        });
        onProviderLinked?.(linkingState.providerId);
        await loadAuthProviders(); // Refresh providers
      } else if (result.error) {
        onError?.(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify email';
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unlink an existing provider
  const unlinkProvider = async (providerId: string) => {
    // Don't allow unlinking the last provider or the primary provider
    const provider = linkedProviders.find(p => p.provider === providerId);
    
    if (!provider) return false;
    
    if (linkedProviders.length === 1) {
      onError?.('Cannot remove the last authentication method');
      return false;
    }
    
    if (provider.isPrimary) {
      onError?.('Cannot remove the primary authentication method');
      return false;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await unlinkAuthProvider({
        userId,
        providerId
      });
      
      if (result.success) {
        await loadAuthProviders(); // Refresh providers
        onProviderUnlinked?.(providerId);
        return true;
      } else if (result.error) {
        onError?.(result.error);
        return false;
      }
      
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unlink provider';
      onError?.(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set a provider as primary
  const setPrimaryProvider = async (providerId: string) => {
    const provider = linkedProviders.find(p => p.provider === providerId);
    
    if (!provider || provider.isPrimary) return true; // Already primary
    
    setIsSubmitting(true);
    
    try {
      const result = await setPrimaryAuthProvider({
        userId,
        providerId
      });
      
      if (result.success) {
        await loadAuthProviders(); // Refresh providers
        return true;
      } else if (result.error) {
        onError?.(result.error);
        return false;
      }
      
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set primary provider';
      onError?.(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel linking process
  const cancelLinking = () => {
    setLinkingState({
      isActive: false,
      providerId: null,
      step: 'initial'
    });
    setVerificationEmail('');
  };

  // Refresh providers
  const refreshProviders = async () => {
    await loadAuthProviders();
  };
  
  // Prepare render props
  const renderProps: ProviderManagementPanelRenderProps = {
    linkedProviders,
    availableProviders,
    startLinking,
    unlinkProvider,
    setPrimaryProvider,
    linkingState,
    cancelLinking,
    isLoading,
    error,
    refreshProviders,
    verificationEmail,
    setVerificationEmail,
    handleVerificationSubmit,
    hasPassword
  };
  
  return children(renderProps);
};

export default ProviderManagementPanel;
