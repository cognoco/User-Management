import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { useTeams } from '@/hooks/team/useTeams';
import { useSubscriptionStore } from '@/lib/stores/subscription.store';
import { SubscriptionStatus } from '@/types/subscription';
import { UserType } from '@/types/user-type';

/**
 * Steps of the account deletion flow
 */
export type AccountDeletionStep = 'initial' | 'confirm' | 'completed';

/**
 * Render props provided by the AccountDeletion component
 */
export interface AccountDeletionRenderProps {
  /** Whether the deletion request is in progress */
  isDeleting: boolean;
  /** Current value of the confirmation input */
  confirmationValue: string;
  /** Validation or server errors */
  errors: {
    confirmation?: string;
    server?: string | null;
  };
  /** Current step in the deletion flow */
  step: AccountDeletionStep;
  /** Start the deletion process */
  onInitiateDelete: () => void;
  /** Confirm the deletion */
  onConfirmDelete: () => Promise<void>;
  /** Cancel the deletion process */
  onCancelDelete: () => void;
  /** Update the confirmation input */
  onConfirmationChange: (value: string) => void;
}

/**
 * Props for the AccountDeletion component
 */
export interface AccountDeletionProps {
  /** Render prop function controlling UI rendering */
  children: (props: AccountDeletionRenderProps) => React.ReactNode;
}

/**
 * Headless component implementing the account deletion flow.
 * It exposes state and handlers via render props and performs no UI rendering.
 */
export function AccountDeletion({ children }: AccountDeletionProps) {
  const { deleteAccount, user, isLoading, error } = useAuth();
  const { teams } = useTeams();
  const { userSubscription } = useSubscriptionStore();

  const [step, setStep] = useState<AccountDeletionStep>('initial');
  const [confirmationValue, setConfirmationValue] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep('initial');
    setConfirmationValue('');
    setLocalError(null);
  }, []);

  const onInitiateDelete = useCallback(() => {
    setLocalError(null);
    // Business rules: block if user owns a team
    const ownsTeam = teams.some(t => t.ownerId === user?.id);
    if (ownsTeam) {
      setLocalError('Transfer team ownership before deleting your account.');
      return;
    }
    // Block if active subscription
    if (userSubscription && userSubscription.status === SubscriptionStatus.ACTIVE) {
      setLocalError('Cancel your active subscription before deleting your account.');
      return;
    }
    setStep('confirm');
  }, [teams, user, userSubscription]);

  const validateConfirmation = useCallback(() => {
    if ((user as any)?.userType === UserType.CORPORATE) {
      if (!confirmationValue) {
        setLocalError('Password is required');
        return false;
      }
      return true;
    }
    if (confirmationValue !== 'DELETE') {
      setLocalError('Please type DELETE to confirm');
      return false;
    }
    return true;
  }, [confirmationValue, user]);

  const onConfirmDelete = useCallback(async () => {
    setLocalError(null);
    if (!validateConfirmation()) return;
    try {
      await deleteAccount((user as any)?.userType === UserType.CORPORATE ? confirmationValue : undefined);
      setStep('completed');
    } catch (e: any) {
      setLocalError(e.message || 'Failed to delete account');
    }
  }, [deleteAccount, confirmationValue, user, validateConfirmation]);

  const onCancelDelete = useCallback(() => {
    reset();
  }, [reset]);

  const onConfirmationChange = useCallback((value: string) => {
    setConfirmationValue(value);
  }, []);

  return (
    <>
      {children({
        isDeleting: isLoading,
        confirmationValue,
        errors: { confirmation: localError || undefined, server: error },
        step,
        onInitiateDelete,
        onConfirmDelete,
        onCancelDelete,
        onConfirmationChange,
      })}
    </>
  );
}

export default AccountDeletion;
