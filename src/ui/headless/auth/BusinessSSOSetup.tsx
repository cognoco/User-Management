import { ReactNode, useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { api } from '@/lib/api/axios';

/**
 * Headless BusinessSSOSetup component that handles behavior only
 * This follows the headless UI pattern from the architecture guidelines
 */
export interface BusinessSSOSetupProps {
  /**
   * Organization ID for which to set up SSO
   */
  organizationId: string;

  /**
   * Called when SSO setup is successful
   */
  onSuccess?: (result: { success: boolean; message: string }) => void;

  /**
   * Called when SSO setup fails
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
  children: (props: BusinessSSOSetupRenderProps) => ReactNode;
}

export interface SSOProvider {
  id: string;
  name: string;
  logoUrl: string;
  configFields: Array<{
    id: string;
    name: string;
    description: string;
    required: boolean;
    type: 'text' | 'password' | 'url' | 'file';
  }>;
}

export interface BusinessSSOSetupRenderProps {
  /**
   * Available SSO providers that can be configured
   */
  availableProviders: SSOProvider[];

  /**
   * Currently selected provider
   */
  selectedProvider: SSOProvider | null;

  /**
   * Select a provider to configure
   */
  selectProvider: (providerId: string) => void;

  /**
   * Configuration values for the selected provider
   */
  configValues: Record<string, string>;

  /**
   * Set a configuration value
   */
  setConfigValue: (fieldId: string, value: string) => void;

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
    config?: Record<string, string>;
    form?: string;
  };

  /**
   * Whether fields have been touched
   */
  touched: Record<string, boolean>;

  /**
   * Handle field blur
   */
  handleBlur: (fieldId: string) => void;

  /**
   * Test the SSO configuration
   */
  testConfiguration: () => Promise<{ success: boolean; message: string }>;

  /**
   * Reset the form
   */
  resetForm: () => void;
}

export const BusinessSSOSetup = ({
  organizationId,
  onSuccess,
  onError,
  isLoading: externalIsLoading,
  error: externalError,
  children
}: BusinessSSOSetupProps) => {
  // Get authentication hook — only use what exists in UseAuth
  const { isLoading: authIsLoading, error: authError } = useAuth();

  // SSO management API helpers (not yet in useAuth)
  const getSSOProviders = async (_orgId?: string): Promise<SSOProvider[]> => {
    const res = await api.get('/auth/sso/providers');
    return res.data;
  };

  const configureSSOProvider = async (params: { organizationId?: string; providerId: string; config: Record<string, string> }): Promise<{ success: boolean; message?: string; error?: string }> => {
    const res = await api.post('/auth/sso/configure', params);
    return res.data;
  };

  const testSSOConfiguration = async (params: { organizationId?: string; providerId: string; config?: Record<string, string> }): Promise<{ success: boolean; message: string }> => {
    const res = await api.post('/auth/sso/test', params);
    return res.data;
  };
  
  // Form state
  const [availableProviders, setAvailableProviders] = useState<SSOProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<SSOProvider | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    config?: Record<string, string>;
    form?: string;
  }>({ config: {} });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : (authError ?? undefined);

  // Load available SSO providers
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const providers = await getSSOProviders(organizationId);
        setAvailableProviders(providers);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load SSO providers';
        setErrors({ ...errors, form: errorMessage });
        onError?.(errorMessage);
      }
    };

    loadProviders();
  }, [organizationId]);

  // Select a provider
  const selectProvider = (providerId: string) => {
    const provider = availableProviders.find(p => p.id === providerId) || null;
    setSelectedProvider(provider);
    
    // Reset config values and errors
    if (provider) {
      const initialValues: Record<string, string> = {};
      const initialTouched: Record<string, boolean> = {};
      
      provider.configFields.forEach(field => {
        initialValues[field.id] = '';
        initialTouched[field.id] = false;
      });
      
      setConfigValues(initialValues);
      setTouched(initialTouched);
      setErrors({ config: {} });
    }
  };

  // Set a configuration value
  const setConfigValue = (fieldId: string, value: string) => {
    setConfigValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Clear error for this field
    if (errors.config && errors.config[fieldId]) {
      setErrors(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [fieldId]: _removed, ...restConfig } = prev.config ?? {};
        return { ...prev, config: restConfig };
      });
    }
  };

  // Validate configuration
  const validateConfig = () => {
    if (!selectedProvider) return false;
    
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    selectedProvider.configFields.forEach(field => {
      if (field.required && !configValues[field.id]?.trim()) {
        newErrors[field.id] = `${field.name} is required`;
        isValid = false;
      }
    });
    
    setErrors(prev => ({
      ...prev,
      config: newErrors
    }));
    
    return isValid;
  };

  // Check if form is valid
  const isValid = selectedProvider !== null && 
    !Object.values(errors.config || {}).some(error => !!error) &&
    selectedProvider.configFields
      .filter(field => field.required)
      .every(field => !!configValues[field.id]?.trim());

  // Handle field blur
  const handleBlur = (fieldId: string) => {
    setTouched(prev => ({
      ...prev,
      [fieldId]: true
    }));
    
    // Validate the specific field
    if (selectedProvider) {
      const field = selectedProvider.configFields.find(f => f.id === fieldId);
      
      if (field?.required && !configValues[fieldId]?.trim()) {
        setErrors(prev => ({
          ...prev,
          config: {
            ...prev.config,
            [fieldId]: `${field.name} is required`
          }
        }));
      } else {
        setErrors(prev => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [fieldId]: _removed, ...restConfig } = prev.config ?? {};
          return { ...prev, config: restConfig };
        });
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset form error
    setErrors(prev => ({ ...prev, form: undefined }));
    
    if (!selectedProvider) {
      setErrors(prev => ({ ...prev, form: 'Please select an SSO provider' }));
      return;
    }
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    selectedProvider.configFields.forEach(field => {
      allTouched[field.id] = true;
    });
    setTouched(allTouched);
    
    // Validate form
    const isConfigValid = validateConfig();
    if (!isConfigValid) {
      return;
    }
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      const result = await configureSSOProvider({
        organizationId,
        providerId: selectedProvider.id,
        config: configValues
      });
      
      if (result.success) {
        onSuccess?.({ success: result.success, message: result.message ?? 'SSO configured successfully' });
      } else if (result.error) {
        setErrors(prev => ({ ...prev, form: result.error }));
        onError?.(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to configure SSO provider';
      setErrors(prev => ({ ...prev, form: errorMessage }));
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Test the SSO configuration
  const testConfiguration = async () => {
    if (!selectedProvider) {
      return { success: false, message: 'Please select an SSO provider' };
    }
    
    // Validate form
    const isConfigValid = validateConfig();
    if (!isConfigValid) {
      return { success: false, message: 'Please fix the configuration errors' };
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await testSSOConfiguration({
        organizationId,
        providerId: selectedProvider.id,
        config: configValues
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to test SSO configuration';
      return { success: false, message: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset the form
  const resetForm = () => {
    setSelectedProvider(null);
    setConfigValues({});
    setTouched({});
    setErrors({ config: {} });
  };

  // If there's a form error from the auth service, display it
  useEffect(() => {
    if (formError) {
      setErrors(prev => ({ ...prev, form: formError }));
    }
  }, [formError]);
  
  // Prepare render props
  const renderProps: BusinessSSOSetupRenderProps = {
    availableProviders,
    selectedProvider,
    selectProvider,
    configValues,
    setConfigValue,
    handleSubmit,
    isSubmitting: isLoading,
    isValid,
    errors: {
      ...errors,
      form: errors.form || formError
    },
    touched,
    handleBlur,
    testConfiguration,
    resetForm
  };
  
  return children(renderProps);
};

export default BusinessSSOSetup;
