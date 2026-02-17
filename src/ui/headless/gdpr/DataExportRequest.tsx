import React from 'react';
import { useDataExport } from '@/hooks/gdpr/useDataExport';

export interface DataExportRequestProps {
  render: (props: {
    requestExport: () => Promise<string | null>;
    isLoading: boolean;
    error: string | null;
    downloadUrl: string | null;
  }) => React.ReactNode;
}

export function DataExportRequest({ render }: DataExportRequestProps) {
  const { requestExport, isLoading, error, downloadUrl } = useDataExport();
  return <>{render({ requestExport, isLoading, error, downloadUrl })}</>;
}

export default DataExportRequest;
