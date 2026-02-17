/**
 * Headless Delete Account Dialog Component
 * 
 * This component handles the behavior of account deletion without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState } from 'react';
import { useDeleteAccount } from '@/hooks/user/useDeleteAccount';

const CONFIRMATION_TEXT = 'DELETE';

export interface DeleteAccountDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;
  
  /**
   * Called when the dialog should close
   */
  onClose: () => void;
  
  /**
   * Render prop function that receives dialog state and handlers
   */
  render: (props: {
    confirmText: string;
    setConfirmText: (text: string) => void;
    isConfirmed: boolean;
    isLoading: boolean;
    error: string | null;
    handleDeleteAccount: () => Promise<void>;
    handleCancel: () => void;
    confirmationText: string;
  }) => React.ReactNode;
}

export function DeleteAccountDialog({
  open,
  onClose,
  render
}: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const { deleteAccount, isLoading, error } = useDeleteAccount();

  const isConfirmed = confirmText === CONFIRMATION_TEXT;

  const handleDeleteAccount = async () => {
    if (isConfirmed) {
      await deleteAccount({} as any);
      if (!error) {
        onClose();
      }
    }
  };

  const handleCancel = () => {
    onClose();
  };

  // Render the component using the render prop
  return render({
    confirmText,
    setConfirmText,
    isConfirmed,
    isLoading,
    error,
    handleDeleteAccount,
    handleCancel,
    confirmationText: CONFIRMATION_TEXT
  });
}
