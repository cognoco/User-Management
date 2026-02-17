/**
 * Headless Invitation Manager Component
 * 
 * This component handles the behavior of team invitation management without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState, FormEvent, useEffect, useCallback } from 'react';
import { useTeamInvitations } from '@/hooks/team/useTeamInvitations';
import { useAuth } from '@/hooks/auth/useAuth';
import { TeamInvitation } from '@/core/team/models';
import { z } from 'zod';

export interface InvitationManagerProps {
  /**
   * ID of the team to manage invitations for
   */
  teamId?: string;
  
  /**
   * Called when an invitation is sent
   */
  onSendInvitation?: (email: string, role: string) => Promise<void>;
  
  /**
   * Called when an invitation is accepted
   */
  onAcceptInvitation?: (invitationId: string) => Promise<void>;
  
  /**
   * Called when an invitation is declined
   */
  onDeclineInvitation?: (invitationId: string) => Promise<void>;
  
  /**
   * Called when an invitation is canceled
   */
  onCancelInvitation?: (invitationId: string) => Promise<void>;
  
  /**
   * Called when an invitation is resent
   */
  onResendInvitation?: (invitationId: string) => Promise<void>;
  
  /**
   * Custom loading state (if not provided, internal state is used)
   */
  isLoading?: boolean;
  
  /**
   * Custom error message (if not provided, internal state is used)
   */
  error?: string;
  
  /**
   * Custom success message (if not provided, internal state is used)
   */
  successMessage?: string;
  
  /**
   * Render prop function that receives state and handlers
   */
  render: (props: {
    // Invitation form state and handlers
    handleSendInvitation: (e: FormEvent) => void;
    emailValue: string;
    setEmailValue: (value: string) => void;
    roleValue: string;
    setRoleValue: (value: string) => void;
    isSubmitting: boolean;
    isValid: boolean;
    formErrors: {
      email?: string;
      role?: string;
      form?: string;
    };
    touched: {
      email: boolean;
      role: boolean;
    };
    handleBlur: (field: 'email' | 'role') => void;
    resetForm: () => void;
    
    // Invitation list state and handlers
    teamInvitations: TeamInvitation[];
    userInvitations: TeamInvitation[];
    acceptInvitation: (invitationId: string) => Promise<void>;
    declineInvitation: (invitationId: string) => Promise<void>;
    cancelInvitation: (invitationId: string) => Promise<void>;
    resendInvitation: (invitationId: string) => Promise<void>;
    refreshInvitations: () => Promise<void>;
    
    // General state
    isLoading: boolean;
    error?: string;
    successMessage?: string;
    availableRoles: { value: string; label: string }[];
  }) => React.ReactNode;
}

// Available roles
const availableRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' }
];

// Invitation form validation schema
const invitationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.string().min(1, 'Please select a role')
});

export function InvitationManager({
  teamId,
  onSendInvitation,
  onAcceptInvitation,
  onDeclineInvitation,
  onCancelInvitation,
  onResendInvitation,
  isLoading: externalIsLoading,
  error: externalError,
  successMessage: externalSuccessMessage,
  render
}: InvitationManagerProps) {
  // Get team invitations hook
  const { 
    teamInvitations,
    userInvitations,
    fetchTeamInvitations,
    fetchUserInvitations,
    acceptInvitation: acceptInvitationHook,
    declineInvitation: declineInvitationHook,
    cancelInvitation: cancelInvitationHook,
    resendInvitation: resendInvitationHook,
    isLoading: invitationsIsLoading, 
    error: invitationsError,
    successMessage: invitationsSuccessMessage
  } = useTeamInvitations(teamId);
  
  // Get current user from auth hook
  const { user } = useAuth();
  
  // Form state
  const [emailValue, setEmailValue] = useState('');
  const [roleValue, setRoleValue] = useState('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    email?: string;
    role?: string;
    form?: string;
  }>({});
  const [touched, setTouched] = useState({
    email: false,
    role: false
  });
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : invitationsIsLoading || isSubmitting;
  const error = externalError !== undefined ? externalError : invitationsError;
  const successMessage = externalSuccessMessage !== undefined ? externalSuccessMessage : invitationsSuccessMessage;
  
  // Fetch invitations on mount
  useEffect(() => {
    if (teamId) {
      fetchTeamInvitations(teamId);
    }
    
    if (user?.email) {
      fetchUserInvitations(user.email);
    }
  }, [teamId, user, fetchTeamInvitations, fetchUserInvitations]);
  
  // Reset form
  const resetForm = () => {
    setEmailValue('');
    setRoleValue('member');
    setFormErrors({});
    setTouched({
      email: false,
      role: false
    });
  };
  
  // Validate form
  const validateForm = () => {
    try {
      invitationSchema.parse({
        email: emailValue,
        role: roleValue
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setFormErrors(newErrors);
      }
      return false;
    }
  };
  
  // Check if form is valid
  const isValid = !formErrors.email && !formErrors.role && emailValue.trim() !== '' && roleValue.trim() !== '';
  
  // Handle field blur
  const handleBlur = (field: 'email' | 'role') => {
    setTouched({ ...touched, [field]: true });
    
    // Validate the specific field
    try {
      if (field === 'email') {
        z.string().email('Please enter a valid email address').parse(emailValue);
        setFormErrors({ ...formErrors, email: undefined });
      } else if (field === 'role') {
        z.string().min(1, 'Please select a role').parse(roleValue);
        setFormErrors({ ...formErrors, role: undefined });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = { ...formErrors };
        error.errors.forEach((err) => {
          if (field === 'email' || field === 'role') {
            newErrors[field] = err.message;
          }
        });
        setFormErrors(newErrors);
      }
    }
  };
  
  // Handle send invitation
  const handleSendInvitation = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset form error
    setFormErrors({ ...formErrors, form: undefined });
    
    // Mark fields as touched
    setTouched({
      email: true,
      role: true
    });
    
    // Validate form
    const isFormValid = validateForm();
    if (!isFormValid) {
      return;
    }
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      if (onSendInvitation) {
        // Use custom send handler
        await onSendInvitation(emailValue, roleValue);
        resetForm();
        
        // Refresh invitations
        if (teamId) {
          await fetchTeamInvitations(teamId);
        }
      } else {
        // In a real implementation, we would call a service method here
        console.log('Sending invitation to', emailValue, 'with role', roleValue);
        resetForm();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
      setFormErrors({ ...formErrors, form: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Accept invitation
  const acceptInvitationHandler = useCallback(async (invitationId: string) => {
    if (!invitationId || !user?.id) return;
    
    try {
      if (onAcceptInvitation) {
        // Use custom accept handler
        await onAcceptInvitation(invitationId);
      } else {
        // Use default hook
        await acceptInvitationHook(invitationId, user.id);
      }
      
      // Refresh user invitations
      if (user?.email) {
        await fetchUserInvitations(user.email);
      }
    } catch (error) {
      console.error('Failed to accept invitation:', error);
    }
  }, [user, onAcceptInvitation, acceptInvitationHook, fetchUserInvitations]);
  
  // Decline invitation
  const declineInvitationHandler = useCallback(async (invitationId: string) => {
    if (!invitationId) return;
    
    try {
      if (onDeclineInvitation) {
        // Use custom decline handler
        await onDeclineInvitation(invitationId);
      } else {
        // Use default hook
        await declineInvitationHook(invitationId);
      }
      
      // Refresh user invitations
      if (user?.email) {
        await fetchUserInvitations(user.email);
      }
    } catch (error) {
      console.error('Failed to decline invitation:', error);
    }
  }, [user, onDeclineInvitation, declineInvitationHook, fetchUserInvitations]);
  
  // Cancel invitation
  const cancelInvitationHandler = useCallback(async (invitationId: string) => {
    if (!invitationId || !teamId) return;
    
    try {
      if (onCancelInvitation) {
        // Use custom cancel handler
        await onCancelInvitation(invitationId);
      } else {
        // Use default hook
        await cancelInvitationHook(invitationId);
      }
      
      // Refresh team invitations
      if (teamId) {
        await fetchTeamInvitations(teamId);
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  }, [teamId, onCancelInvitation, cancelInvitationHook, fetchTeamInvitations]);
  
  // Resend invitation
  const resendInvitationHandler = useCallback(async (invitationId: string) => {
    if (!invitationId || !teamId) return;
    
    try {
      if (onResendInvitation) {
        // Use custom resend handler
        await onResendInvitation(invitationId);
      } else {
        // Use default hook
        await resendInvitationHook(invitationId);
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error);
    }
  }, [teamId, onResendInvitation, resendInvitationHook]);
  
  // Refresh invitations
  const refreshInvitations = useCallback(async () => {
    if (teamId) {
      await fetchTeamInvitations(teamId);
    }
    
    if (user?.email) {
      await fetchUserInvitations(user.email);
    }
  }, [teamId, user, fetchTeamInvitations, fetchUserInvitations]);
  
  // If there's a form error from the invitations service, display it
  useEffect(() => {
    if (error) {
      setFormErrors({ ...formErrors, form: error });
    }
  }, [error]);
  
  // Render the component using the render prop
  return render({
    // Invitation form state and handlers
    handleSendInvitation,
    emailValue,
    setEmailValue,
    roleValue,
    setRoleValue,
    isSubmitting,
    isValid,
    formErrors,
    touched,
    handleBlur,
    resetForm,
    
    // Invitation list state and handlers
    teamInvitations,
    userInvitations,
    acceptInvitation: acceptInvitationHandler,
    declineInvitation: declineInvitationHandler,
    cancelInvitation: cancelInvitationHandler,
    resendInvitation: resendInvitationHandler,
    refreshInvitations,
    
    // General state
    isLoading,
    error: error ?? undefined,
    successMessage: successMessage ?? undefined,
    availableRoles
  });
}
