import { ReactNode, useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { api } from '@/lib/api/axios';

/**
 * Headless DomainBasedOrgMatching component that handles behavior only
 * This follows the headless UI pattern from the architecture guidelines
 */
export interface DomainBasedOrgMatchingProps {
  /**
   * Email address to match against organization domains
   */
  email?: string;

  /**
   * Called when organization matching is successful
   */
  onMatch?: (organizations: Organization[]) => void;

  /**
   * Called when no matching organizations are found
   */
  onNoMatch?: () => void;

  /**
   * Called when organization matching fails
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
  children: (props: DomainBasedOrgMatchingRenderProps) => ReactNode;
}

export interface Organization {
  id: string;
  name: string;
  domain: string;
  logoUrl?: string;
  ssoEnabled: boolean;
}

export interface DomainBasedOrgMatchingRenderProps {
  /**
   * Current email value
   */
  emailValue: string;

  /**
   * Set email value
   */
  setEmailValue: (value: string) => void;

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
    email?: string;
    form?: string;
  };

  /**
   * Whether fields have been touched
   */
  touched: {
    email: boolean;
  };

  /**
   * Handle field blur
   */
  handleBlur: () => void;

  /**
   * Matched organizations
   */
  matchedOrganizations: Organization[];

  /**
   * Whether matching has been attempted
   */
  hasAttemptedMatching: boolean;

  /**
   * Select an organization
   */
  selectOrganization: (organizationId: string) => void;

  /**
   * Continue without organization
   */
  continueWithoutOrg: () => void;
}

export const DomainBasedOrgMatching = ({
  email: initialEmail = '',
  onMatch,
  onNoMatch,
  onError,
  isLoading: externalIsLoading,
  error: externalError,
  children
}: DomainBasedOrgMatchingProps) => {
  // Get authentication hook
  const { isLoading: authIsLoading, error: authError } = useAuth();
  const matchOrganizationByDomain = async (domain: string): Promise<Organization[]> => {
    const res = await api.get(`/organizations/by-domain/${domain}`);
    const data = Array.isArray(res.data) ? res.data : [res.data].filter(Boolean);
    return data.map((org: any) => ({ id: org.id, name: org.name, domain: org.domain, logoUrl: org.logoUrl, ssoEnabled: org.ssoEnabled ?? false }));
  };
  
  // Form state
  const [emailValue, setEmailValue] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    form?: string;
  }>({});
  const [touched, setTouched] = useState({
    email: false
  });
  const [matchedOrganizations, setMatchedOrganizations] = useState<Organization[]>([]);
  const [hasAttemptedMatching, setHasAttemptedMatching] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : (authError ?? undefined);

  // Validate email
  const validateEmail = () => {
    if (!emailValue.trim()) {
      setErrors({ ...errors, email: 'Email is required' });
      return false;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setErrors({ ...errors, email: 'Please enter a valid email address' });
      return false;
    }
    
    setErrors({ ...errors, email: undefined });
    return true;
  };

  // Check if form is valid
  const isValid = !errors.email && emailValue.trim() !== '';

  // Handle field blur
  const handleBlur = () => {
    setTouched({ email: true });
    validateEmail();
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset form error
    setErrors({ ...errors, form: undefined });
    
    // Mark email as touched
    setTouched({ email: true });
    
    // Validate form
    const isEmailValid = validateEmail();
    if (!isEmailValid) {
      return;
    }
    
    // Submit form
    setIsSubmitting(true);
    setHasAttemptedMatching(true);
    
    try {
      // Extract domain from email
      const domain = emailValue.split('@')[1];
      
      // Call the organization matching function
      const organizations = await matchOrganizationByDomain(domain);
      
      setMatchedOrganizations(organizations);
      
      if (organizations.length > 0) {
        onMatch?.(organizations);
      } else {
        onNoMatch?.();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to match organization';
      setErrors({ ...errors, form: errorMessage });
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Select an organization
  const selectOrganization = (organizationId: string) => {
    const organization = matchedOrganizations.find(org => org.id === organizationId);
    if (organization) {
      // Redirect to organization SSO login or other action
      // This would typically be handled by the parent component via onMatch
    }
  };

  // Continue without organization
  const continueWithoutOrg = () => {
    onNoMatch?.();
  };

  // If there's a form error from the auth service, display it
  useEffect(() => {
    if (formError) {
      setErrors({ ...errors, form: formError });
    }
  }, [formError]);

  // Auto-match organization if email is provided initially
  useEffect(() => {
    if (initialEmail && !hasAttemptedMatching) {
      const isEmailValid = validateEmail();
      if (isEmailValid) {
        // Simulate form submission
        const submitEvent = { preventDefault: () => {} } as FormEvent;
        handleSubmit(submitEvent);
      }
    }
  }, []);
  
  // Prepare render props
  const renderProps: DomainBasedOrgMatchingRenderProps = {
    emailValue,
    setEmailValue,
    handleSubmit,
    isSubmitting: isLoading,
    isValid,
    errors: {
      ...errors,
      form: errors.form || formError
    },
    touched,
    handleBlur,
    matchedOrganizations,
    hasAttemptedMatching,
    selectOrganization,
    continueWithoutOrg
  };
  
  return children(renderProps);
};

export default DomainBasedOrgMatching;
