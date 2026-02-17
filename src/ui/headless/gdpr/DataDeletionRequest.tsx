import React from 'react';
import { useDataDeletion } from '@/hooks/gdpr/useDataDeletion';

export interface DataDeletionRequestProps {
  render: (props: {
    requestDeletion: () => Promise<boolean>;
    isLoading: boolean;
    success: boolean;
    error: string | null;
  }) => React.ReactNode;
}

export function DataDeletionRequest({ render }: DataDeletionRequestProps) {
  const { requestDeletion, isLoading, success, error } = useDataDeletion();
  return <>{render({ requestDeletion, isLoading, success, error })}</>;
}

export default DataDeletionRequest;
