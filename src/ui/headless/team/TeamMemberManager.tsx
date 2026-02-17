/**
 * Headless Team Member Manager Component
 * 
 * This component handles the behavior of team member management without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTeamMembers } from '@/hooks/team/useTeamMembers';
import { TeamMember, TeamMemberUpdatePayload } from '@/core/team/models';

export interface TeamMemberManagerProps {
  /**
   * ID of the team to manage members for
   */
  teamId: string;
  
  /**
   * Called when a member's role is updated
   */
  onUpdateMember?: (userId: string, updateData: TeamMemberUpdatePayload) => Promise<void>;
  
  /**
   * Called when a member is removed from the team
   */
  onRemoveMember?: (userId: string) => Promise<void>;
  
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
    members: TeamMember[];
    isLoading: boolean;
    error?: string;
    successMessage?: string;
    updateMemberRole: (userId: string, role: string) => Promise<void>;
    removeMember: (userId: string) => Promise<void>;
    refreshMembers: () => Promise<void>;
    availableRoles: { value: string; label: string }[];
  }) => React.ReactNode;
}

// Available roles
const availableRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' }
];

export function TeamMemberManager({
  teamId,
  onUpdateMember,
  onRemoveMember,
  isLoading: externalIsLoading,
  error: externalError,
  successMessage: externalSuccessMessage,
  render
}: TeamMemberManagerProps) {
  // Get team members hook
  const { 
    members, 
    fetchTeamMembers,
    updateTeamMember,
    removeTeamMember,
    isLoading: membersIsLoading, 
    error: membersError,
    successMessage: membersSuccessMessage
  } = useTeamMembers(teamId);
  
  // Local state
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : membersIsLoading || isProcessing;
  const error: string | undefined = externalError !== undefined ? externalError : (membersError ?? undefined);
  const successMessage: string | undefined = externalSuccessMessage !== undefined ? externalSuccessMessage : (membersSuccessMessage ?? undefined);
  
  // Fetch team members on mount and when teamId changes
  useEffect(() => {
    if (teamId) {
      fetchTeamMembers();
    }
  }, [teamId, fetchTeamMembers]);
  
  // Update member role
  const updateMemberRole = useCallback(async (userId: string, role: string) => {
    if (!teamId || !userId) return;
    
    setIsProcessing(true);
    
    try {
      if (onUpdateMember) {
        // Use custom update handler
        await onUpdateMember(userId, { role });
      } else {
        // Use default hook
        await updateTeamMember(userId, { role });
      }
    } catch (error) {
      console.error('Failed to update member role:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [teamId, onUpdateMember, updateTeamMember]);
  
  // Remove member
  const removeMember = useCallback(async (userId: string) => {
    if (!teamId || !userId) return;
    
    setIsProcessing(true);
    
    try {
      if (onRemoveMember) {
        // Use custom remove handler
        await onRemoveMember(userId);
      } else {
        // Use default hook
        await removeTeamMember(userId);
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [teamId, onRemoveMember, removeTeamMember]);
  
  // Refresh members
  const refreshMembers = useCallback(async () => {
    if (!teamId) return;
    
    try {
      await fetchTeamMembers();
    } catch (error) {
      console.error('Failed to refresh members:', error);
    }
  }, [teamId, fetchTeamMembers]);
  
  // Render the component using the render prop
  return render({
    members,
    isLoading,
    error,
    successMessage,
    updateMemberRole,
    removeMember,
    refreshMembers,
    availableRoles
  });
}
