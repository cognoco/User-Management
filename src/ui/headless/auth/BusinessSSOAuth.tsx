import { ReactNode, useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { api } from '@/lib/api/axios';

/**
 * Headless BusinessSSOAuth component that handles behavior only
 * This follows the headless UI pattern from the architecture guidelines
 */
export interface BusinessSSOAuthProps {
  /**
   * The domain of the business for SSO authentication
   */
  domain?: string;

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
  children: (props: BusinessSSOAuthRenderProps) => ReactNode;
}

export interface BusinessSSOAuthRenderProps {
  /**
   * Current domain value
   */
  domainValue: string;

  /**
   * Set domain value
   */
  setDomainValue: (value: string) => void;

  /**
   * Handle form submission
   */
  handleSubmit: (e: FormEvent) => void;

  /**
   * Whether the form is currently submitting
   */
  isSubmitting: boolean;

  /**
   * Whether the form is valid
   */
  isValid: boolean;

  /**
   * Form errors
   */
  errors: {
    domain?: string;
    form?: string;
  };

  /**
   * Whether fields have been touched
   */
  touched: {
    domain: boolean;
  };

  /**
   * Handle field blur
   */
  handleBlur: () => void;

  /**
   * Available SSO providers for the domain
   */
  availableProviders: Array<{
    id: string;
    name: string;
    logoUrl: string;
  }>;

  /**
   * Initiate SSO login with a specific provider
   */
  initiateProviderLogin: (providerId: string) => void;
}

export const BusinessSSOAuth = ({
  domain: initialDomain = '',
  onSuccess,
  onError,
  isLoading: externalIsLoading,
  error: externalError,
  children
}: BusinessSSOAuthProps) => {
  // Get authentication hook
  const { isLoading: authIsLoading, error: authError } = useAuth();
  const businessSSOAuth = async (params: { domain?: string; email?: string; organizationId?: string; providerId?: string }): Promise<{ success: boolean; redirectUrl?: string; providers?: { id: string; name: string }[]; userData?: { id: string; email: string; name?: string }; error?: string }> => {
    const res = await api.post('/auth/sso/business', params);
    return res.data;
  };
  
  // Form state
  const [domainValue, setDomainValue] = useState(initialDomain);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    domain?: string;
    form?: string;
  }>({});
  const [touched, setTouched] = useState({
    domain: false
  });
  const [availableProviders, setAvailableProviders] = useState<Array<{
    id: string;
    name: string;
    logoUrl?: string;
  }>>([]);

  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : (authError ?? undefined);

  // Validate domain
  const validateDomain = () => {
    if (!domainValue.trim()) {
      setErrors({ ...errors, domain: 'Domain is required' });
      return false;
    }
    
    // Simple domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domainValue)) {
      setErrors({ ...errors, domain: 'Please enter a valid domain' });
      return false;
    }
    
    setErrors({ ...errors, domain: undefined });
    return true;
  };

  // Check if form is valid
  const isValid = !errors.domain && domainValue.trim() !== '';

  // Handle field blur
  const handleBlur = () => {
    setTouched({ domain: true });
    validateDomain();
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset form error
    setErrors({ ...errors, form: undefined });
    
    // Mark domain as touched
    setTouched({ domain: true });
    
    // Validate form
    const isDomainValid = validateDomain();
    if (!isDomainValid) {
      return;
    }
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      // Call the business SSO auth function to check available providers
      const result = await businessSSOAuth({ domain: domainValue });
      
      if (result.success && result.providers) {
        setAvailableProviders(result.providers);
      } else if (result.error) {
        setErrors({ ...errors, form: result.error });
        onError?.(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check SSO providers';
      setErrors({ ...errors, form: errorMessage });
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initiate login with a specific provider
  const initiateProviderLogin = async (providerId: string) => {
    setIsSubmitting(true);
    setErrors({ ...errors, form: undefined });
    
    try {
      // Call the provider-specific login function
      const result = await businessSSOAuth({
        domain: domainValue,
        providerId
      });
      
      if (result.success && result.userData) {
        onSuccess?.({ email: result.userData.email, name: result.userData.name ?? '', userId: result.userData.id });
      } else if (result.error) {
        setErrors({ ...errors, form: result.error });
        onError?.(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'SSO authentication failed';
      setErrors({ ...errors, form: errorMessage });
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If there's a form error from the auth service, display it
  useEffect(() => {
    if (formError) {
      setErrors({ ...errors, form: formError });
    }
  }, [formError]);
  
  // Prepare render props
  const renderProps: BusinessSSOAuthRenderProps = {
    domainValue,
    setDomainValue,
    handleSubmit,
    isSubmitting: isLoading,
    isValid,
    errors: {
      ...errors,
      form: errors.form || formError
    },
    touched,
    handleBlur,
    availableProviders,
    initiateProviderLogin
  };
  
  return children(renderProps);
};

export default BusinessSSOAuth;
