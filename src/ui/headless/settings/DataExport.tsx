/**
 * Headless Data Export Component
 *
 * Provides behavior for initiating personal data exports without UI.
 */
import { useState } from 'react';
import { ExportFormat, ExportCategory } from '@/lib/utils/data-export';
import { ExportStatus } from '@/lib/exports/types';
import useDataExport from '@/hooks/user/useDataExport';

export interface DataExportProps {
  /** Called when an export is completed and a download URL is available */
  onComplete?: (downloadUrl: string) => void;
  /** Render prop for custom UI */
  render: (props: {
    selectedFormat: ExportFormat;
    setSelectedFormat: (f: ExportFormat) => void;
    selectedCategories: ExportCategory[];
    setSelectedCategories: (c: ExportCategory[]) => void;
    progress: number;
    status: ExportStatus | null;
    downloadUrl: string | null;
    isLoading: boolean;
    error: string | null;
    initiateExport: () => Promise<void>;
    checkStatus: () => Promise<void>;
  }) => React.ReactNode;
}

export function DataExport({ onComplete, render }: DataExportProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(ExportFormat.JSON);
  const [selectedCategories, setSelectedCategories] = useState<ExportCategory[]>([ExportCategory.ALL]);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const { status, isLoading, error, requestExport, refreshStatus } = useDataExport();

  const initiateExport = async () => {
    const res = await requestExport({ format: selectedFormat as any });
    if (res) {
      setProgress(res.status === ExportStatus.COMPLETED ? 100 : 50);
      if (res.downloadUrl) {
        setDownloadUrl(res.downloadUrl);
        onComplete?.(res.downloadUrl);
      }
    }
  };

  const checkStatus = async () => {
    const res = await refreshStatus();
    if (res) {
      setProgress(res.status === ExportStatus.COMPLETED ? 100 : 50);
      if (res.downloadUrl) {
        setDownloadUrl(res.downloadUrl);
        onComplete?.(res.downloadUrl);
      }
    }
  };

  return (
    <>{render({
      selectedFormat,
      setSelectedFormat,
      selectedCategories,
      setSelectedCategories,
      progress,
      status: status ? status.status : null,
      downloadUrl,
      isLoading,
      error,
      initiateExport,
      checkStatus
    })}</>
  );
}

export default DataExport;
