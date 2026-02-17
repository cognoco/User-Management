import { ReactNode, useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { api } from '@/lib/api/axios';

/**
 * Headless IDPConfiguration component that handles behavior only
 * This follows the headless UI pattern from the architecture guidelines
 */
export interface IDPConfigurationProps {
  /**
   * Organization ID for which to configure IDP
   */
  organizationId: string;

  /**
   * Called when IDP configuration is successful
   */
  onSuccess?: (result: { success: boolean; message: string }) => void;

  /**
   * Called when IDP configuration fails
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
  children: (props: IDPConfigurationRenderProps) => ReactNode;
}

export interface IDPProvider {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  configFields: Array<{
    id: string;
    name: string;
    description: string;
    required: boolean;
    type: 'text' | 'password' | 'url' | 'file' | 'textarea';
  }>;
}

export interface IDPConfigurationRenderProps {
  /**
   * Available IDP providers that can be configured
   */
  availableProviders: IDPProvider[];

  /**
   * Currently selected provider
   */
  selectedProvider: IDPProvider | null;

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
   * Test the IDP configuration
   */
  testConfiguration: () => Promise<{ success: boolean; message: string }>;

  /**
   * Reset the form
   */
  resetForm: () => void;

  /**
   * Current IDP configuration status
   */
  idpStatus: 'not_configured' | 'configured' | 'error';

  /**
   * Delete the current IDP configuration
   */
  deleteConfiguration: () => Promise<boolean>;
}

export const IDPConfiguration = ({
  organizationId,
  onSuccess,
  onError,
  isLoading: externalIsLoading,
  error: externalError,
  children
}: IDPConfigurationProps) => {
  // Get authentication hook — only use what exists in UseAuth
  const { isLoading: authIsLoading, error: authError } = useAuth();

  // IDP management API helpers (not yet in useAuth)
  const getIDPProviders = async (orgId: string): Promise<IDPProvider[]> => {
    const res = await api.get(`/organizations/${orgId}/idp/providers`);
    return res.data;
  };

  const getIDPStatus = async (orgId: string): Promise<{ configured: boolean; providerId?: string; config?: Record<string, string> }> => {
    const res = await api.get(`/organizations/${orgId}/idp/status`);
    return res.data;
  };

  const configureIDP = async (params: { organizationId?: string; providerId: string; config: Record<string, string> }): Promise<{ success: boolean; message?: string; error?: string }> => {
    const { organizationId: orgId = '', providerId, config } = params;
    const res = await api.post(`/organizations/${orgId}/idp/configure`, { providerId, config });
    return res.data;
  };

  const testIDPConfiguration = async (params: { organizationId?: string; providerId?: string; config?: Record<string, string> }): Promise<{ success: boolean; message: string }> => {
    const { organizationId: orgId = '' } = params;
    const res = await api.post(`/organizations/${orgId}/idp/test`, params);
    return res.data;
  };

  const deleteIDPConfiguration = async (orgId: string): Promise<{ success: boolean; error?: string }> => {
    const res = await api.delete(`/organizations/${orgId}/idp`);
    return res.data;
  };
  
  // Form state
  const [availableProviders, setAvailableProviders] = useState<IDPProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<IDPProvider | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    config?: Record<string, string>;
    form?: string;
  }>({ config: {} });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [idpStatus, setIdpStatus] = useState<'not_configured' | 'configured' | 'error'>('not_configured');

  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : (authError ?? undefined);

  // Load available IDP providers and current status
  useEffect(() => {
    const loadProvidersAndStatus = async () => {
      try {
        // Load providers
        const providers = await getIDPProviders(organizationId);
        setAvailableProviders(providers);
        
        // Check current IDP status
        const status = await getIDPStatus(organizationId);
        setIdpStatus(status.configured ? 'configured' : 'not_configured');
        
        // If configured, pre-select the provider and load current config
        if (status.configured && status.providerId) {
          const provider = providers.find(p => p.id === status.providerId) || null;
          setSelectedProvider(provider);
          
          if (provider && status.config) {
            setConfigValues(status.config);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load IDP providers';
        setErrors({ ...errors, form: errorMessage });
        setIdpStatus('error');
        onError?.(errorMessage);
      }
    };

    loadProvidersAndStatus();
  }, [organizationId]);

  // Select a provider
  const selectProvider = (providerId: string) => {
    const provider = availableProviders.find(p => p.id === providerId) || null;
    setSelectedProvider(provider);
    
    // Reset config values and errors if selecting a new provider
    if (provider && provider.id !== selectedProvider?.id) {
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
      setErrors(prev => ({ ...prev, form: 'Please select an IDP provider' }));
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
      const result = await configureIDP({
        organizationId,
        providerId: selectedProvider.id,
        config: configValues
      });
      
      if (result.success) {
        setIdpStatus('configured');
        onSuccess?.({ success: result.success, message: result.message ?? 'IDP configured successfully' });
      } else if (result.error) {
        setErrors(prev => ({ ...prev, form: result.error }));
        onError?.(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to configure IDP';
      setErrors(prev => ({ ...prev, form: errorMessage }));
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Test the IDP configuration
  const testConfiguration = async () => {
    if (!selectedProvider) {
      return { success: false, message: 'Please select an IDP provider' };
    }
    
    // Validate form
    const isConfigValid = validateConfig();
    if (!isConfigValid) {
      return { success: false, message: 'Please fix the configuration errors' };
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await testIDPConfiguration({
        organizationId,
        providerId: selectedProvider.id,
        config: configValues
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to test IDP configuration';
      return { success: false, message: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete the current IDP configuration
  const deleteConfiguration = async () => {
    setIsSubmitting(true);
    
    try {
      const result = await deleteIDPConfiguration(organizationId);
      
      if (result.success) {
        setIdpStatus('not_configured');
        resetForm();
        return true;
      } else {
        setErrors(prev => ({ ...prev, form: result.error || 'Failed to delete IDP configuration' }));
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete IDP configuration';
      setErrors(prev => ({ ...prev, form: errorMessage }));
      return false;
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
  const renderProps: IDPConfigurationRenderProps = {
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
    resetForm,
    idpStatus,
    deleteConfiguration
  };
  
  return children(renderProps);
};

export default IDPConfiguration;
