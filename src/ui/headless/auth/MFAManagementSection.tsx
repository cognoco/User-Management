import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { api } from '@/lib/api/axios';

/**
 * Headless MFAManagementSection component that handles behavior only
 * This follows the headless UI pattern from the architecture guidelines
 */
export interface MFAManagementSectionProps {
  /**
   * User ID for which to manage MFA settings
   */
  userId?: string;

  /**
   * Called when MFA settings are updated
   */
  onUpdate?: (result: { success: boolean; message: string }) => void;

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
  children: (props: MFAManagementSectionRenderProps) => ReactNode;
}

export interface MFAMethod {
  id: string;
  type: 'totp' | 'sms' | 'email' | 'backup_codes' | 'security_key';
  name: string;
  isEnabled: boolean;
  lastUsed?: Date;
  createdAt: Date;
}

export interface MFAManagementSectionRenderProps {
  /**
   * Whether MFA is enabled for the user
   */
  isMFAEnabled: boolean;

  /**
   * Available MFA methods
   */
  availableMethods: Array<{
    type: 'totp' | 'sms' | 'email' | 'backup_codes' | 'security_key';
    name: string;
    description: string;
    canEnable: boolean;
  }>;

  /**
   * Currently configured MFA methods
   */
  configuredMethods: MFAMethod[];

  /**
   * Start the setup process for a new MFA method
   */
  startSetup: (methodType: string) => void;

  /**
   * Disable an existing MFA method
   */
  disableMethod: (methodId: string) => Promise<boolean>;

  /**
   * Regenerate backup codes
   */
  regenerateBackupCodes: () => Promise<string[]>;

  /**
   * Current setup state
   */
  setupState: {
    isActive: boolean;
    methodType: string | null;
    step: 'initial' | 'verification' | 'complete';
  };

  /**
   * Cancel the current setup process
   */
  cancelSetup: () => void;

  /**
   * Whether the component is in a loading state
   */
  isLoading: boolean;

  /**
   * Error message, if any
   */
  error?: string;

  /**
   * Refresh MFA methods
   */
  refreshMethods: () => Promise<void>;

  /**
   * Current backup codes
   */
  backupCodes: string[];
}

export const MFAManagementSection = ({
  userId,
  onUpdate,
  onError,
  isLoading: externalIsLoading,
  error: externalError,
  children
}: MFAManagementSectionProps) => {
  // Get authentication hook — only use what exists in UseAuth
  const { isLoading: authIsLoading, error: authError } = useAuth();

  // MFA management API helpers (not yet in useAuth)
  const getUserMFAMethods = async (uid?: string): Promise<MFAMethod[]> => {
    const path = uid ? `/users/${uid}/mfa/methods` : '/auth/mfa/methods';
    const res = await api.get(path);
    return res.data as MFAMethod[];
  };

  const getAvailableMFAMethods = async (): Promise<Array<{ type: 'totp' | 'sms' | 'email' | 'backup_codes' | 'security_key'; name: string; description: string; canEnable: boolean }>> => {
    const res = await api.get('/auth/mfa/available');
    return res.data;
  };

  const disableMFAMethod = async (methodType: string): Promise<{ success: boolean; error?: string }> => {
    const res = await api.delete(`/auth/mfa/${methodType}`);
    return res.data;
  };

  const regenerateMFABackupCodes = async (_uid?: string): Promise<string[]> => {
    const res = await api.post('/auth/mfa/backup-codes/regenerate');
    const data = res.data as { success: boolean; backupCodes?: string[]; error?: string };
    return data.backupCodes ?? [];
  };
  
  // State
  const [isMFAEnabled, setIsMFAEnabled] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<Array<{
    type: 'totp' | 'sms' | 'email' | 'backup_codes' | 'security_key';
    name: string;
    description: string;
    canEnable: boolean;
  }>>([]);
  const [configuredMethods, setConfiguredMethods] = useState<MFAMethod[]>([]);
  const [setupState, setSetupState] = useState({
    isActive: false,
    methodType: null as string | null,
    step: 'initial' as 'initial' | 'verification' | 'complete'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const error = externalError !== undefined ? externalError : (authError ?? undefined);

  // Load MFA methods
  const loadMFAMethods = async () => {
    setIsSubmitting(true);
    
    try {
      // Get user's configured MFA methods
      const methods = await getUserMFAMethods(userId);
      setConfiguredMethods(methods);
      setIsMFAEnabled(methods.some(method => method.isEnabled));
      
      // Get available MFA methods
      const available = await getAvailableMFAMethods();
      setAvailableMethods(available);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load MFA methods';
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load MFA methods on component mount
  useEffect(() => {
    loadMFAMethods();
  }, [userId]);

  // Start setup process for a new MFA method
  const startSetup = (methodType: string) => {
    setSetupState({
      isActive: true,
      methodType,
      step: 'initial'
    });
  };

  // Disable an existing MFA method
  const disableMethod = async (methodId: string) => {
    setIsSubmitting(true);
    
    try {
      const result = await disableMFAMethod(methodId);
      
      if (result.success) {
        // Refresh methods after successful disable
        await loadMFAMethods();
        onUpdate?.({ success: result.success, message: result.error ?? 'MFA method updated' });
        return true;
      } else {
        onError?.(result.error || 'Failed to disable MFA method');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable MFA method';
      onError?.(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Regenerate backup codes
  const regenerateBackupCodes = async () => {
    setIsSubmitting(true);
    
    try {
      const codes = await regenerateMFABackupCodes(userId);
      setBackupCodes(codes);
      
      // Refresh methods after regenerating backup codes
      await loadMFAMethods();
      
      onUpdate?.({ success: true, message: 'Backup codes regenerated successfully' });
      return codes;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate backup codes';
      onError?.(errorMessage);
      return [];
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel setup process
  const cancelSetup = () => {
    setSetupState({
      isActive: false,
      methodType: null,
      step: 'initial'
    });
  };

  // Refresh MFA methods
  const refreshMethods = async () => {
    await loadMFAMethods();
  };
  
  // Prepare render props
  const renderProps: MFAManagementSectionRenderProps = {
    isMFAEnabled,
    availableMethods,
    configuredMethods,
    startSetup,
    disableMethod,
    regenerateBackupCodes,
    setupState,
    cancelSetup,
    isLoading,
    error,
    refreshMethods,
    backupCodes
  };
  
  return children(renderProps);
};

export default MFAManagementSection;
