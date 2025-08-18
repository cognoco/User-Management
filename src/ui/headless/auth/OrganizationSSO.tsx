import React, { ReactNode, useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';

/**
 * Headless OrganizationSSO component that handles behavior only
 * This follows the headless UI pattern from the architecture guidelines
 */
export interface OrganizationSSOProps {
  /**
   * Organization ID for SSO authentication
   */
  organizationId?: string;

  /**
   * Organization domain for SSO authentication (alternative to organizationId)
   */
  organizationDomain?: string;

  /**
   * Called when SSO authentication is successful
   */
  onSuccess?: (userData: { email: string; name: string; userId: string }) => void;

  /**
   * Called when SSO authentication fails
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
  children: (props: OrganizationSSORenderProps) => ReactNode;
}

export interface SSOProvider {
  id: string;
  name: string;
  logoUrl: string;
}

export interface OrganizationSSORenderProps {
  /**
   * Organization details
   */
  organization?: {
    id: string;
    name: string;
    domain: string;
    logoUrl?: string;
  };

  /**
   * Available SSO providers for the organization
   */
  availableProviders: SSOProvider[];

  /**
   * Initiate SSO login with a specific provider
   */
  initiateProviderLogin: (providerId: string) => void;

  /**
   * Whether the component is in a loading state
   */
  isLoading: boolean;

  /**
   * Error message, if any
   */
  error?: string;

  /**
   * Whether SSO is available for the organization
   */
  isSSOAvailable: boolean;

  /**
   * Whether the organization was found
   */
  organizationFound: boolean;

  /**
   * Email domain input for domain-based organization lookup
   */
  emailDomain: string;

  /**
   * Set email domain for domain-based organization lookup
   */
  setEmailDomain: (domain: string) => void;

  /**
   * Handle form submission for domain-based organization lookup
   */
  handleDomainSubmit: (e: FormEvent) => void;
}

export const OrganizationSSO = ({
  organizationId,
  organizationDomain,
  onSuccess,
  onError,
  isLoading: externalIsLoading,
  error: externalError,
  children
}: OrganizationSSOProps): React.ReactElement => {
  // Get authentication hook
  const { 
    getOrganizationSSOProviders, 
    getOrganizationByDomain,
    initiateOrganizationSSO,
    isLoading: authIsLoading, 
    error: authError 
  } = useAuth();
  
  // State
  const [organization, setOrganization] = useState<{
    id: string;
    name: string;
    domain: string;
    logoUrl?: string;
  } | undefined>(undefined);
  const [availableProviders, setAvailableProviders] = useState<SSOProvider[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailDomain, setEmailDomain] = useState(organizationDomain || '');
  const [organizationFound, setOrganizationFound] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const error = externalError !== undefined ? externalError : authError;

  // Load organization and SSO providers
  const loadOrganizationAndProviders = async (orgId?: string, domain?: string): Promise<void> => {
    if (!orgId && !domain) return;
    
    setIsSubmitting(true);
    
    try {
      let organizationData;
      
      // Get organization by ID or domain
      if (orgId) {
        // Assuming we have a function to get organization by ID
        // This would typically come from a different hook or service
        organizationData = { id: orgId, name: '', domain: '' }; // Placeholder
      } else if (domain) {
        organizationData = await getOrganizationByDomain(domain);
      }
      
      if (organizationData) {
        setOrganization(organizationData);
        setOrganizationFound(true);
        
        // Get SSO providers for the organization
        const providers = await getOrganizationSSOProviders(organizationData.id);
        setAvailableProviders(providers);
      } else {
        setOrganizationFound(false);
        onError?.('Organization not found');
      }
    } catch (err) {
      setOrganizationFound(false);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load organization SSO providers';
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load organization and SSO providers on component mount or when props change
  useEffect(() => {
    loadOrganizationAndProviders(organizationId, organizationDomain);
  }, [organizationId, organizationDomain]);

  // Initiate SSO login with a specific provider
  const initiateProviderLogin = async (providerId: string): Promise<void> => {
    if (!organization) return;
    
    setIsSubmitting(true);
    
    try {
      const result = await initiateOrganizationSSO({
        organizationId: organization.id,
        providerId
      });
      
      if (result.success && result.redirectUrl) {
        // Redirect to the SSO provider's login page
        window.location.href = result.redirectUrl;
      } else if (result.error) {
        onError?.(result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate SSO login';
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form submission for domain-based organization lookup
  const handleDomainSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!emailDomain.trim()) return;
    
    await loadOrganizationAndProviders(undefined, emailDomain.trim());
  };
  
  // Prepare render props
  const renderProps: OrganizationSSORenderProps = {
    organization,
    availableProviders,
    initiateProviderLogin,
    isLoading,
    error,
    isSSOAvailable: availableProviders.length > 0,
    organizationFound,
    emailDomain,
    setEmailDomain,
    handleDomainSubmit
  };
  
  return children(renderProps);
};

export default OrganizationSSO;
