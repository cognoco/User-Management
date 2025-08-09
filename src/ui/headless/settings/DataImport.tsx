/**
 * Headless Data Import Component
 *
 * Handles file parsing and optional upload logic without UI.
 */
import { useState } from 'react';
// Removed direct Supabase dependency; use backend API

export interface DataImportProps {
  onSuccess?: (summary: any) => void;
  onError?: (error: string) => void;
  render: (props: {
    file: File | null;
    setFile: (f: File | null) => void;
    isLoading: boolean;
    error: string | null;
    handleImport: () => Promise<void>;
  }) => React.ReactNode;
}

async function parseFile(file: File): Promise<any> {
  const text = await file.text();
  if (file.name.endsWith('.json')) return JSON.parse(text);
  if (file.name.endsWith('.csv')) return text.split('\n').map(r => r.split(','));
  throw new Error('Unsupported format');
}

export function DataImport({ onSuccess, onError, render }: DataImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await parseFile(file);
      const resp = await fetch('/api/import-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Import failed');
      onSuccess?.(result.inserted);
    } catch (err: any) {
      setError(err.message);
      onError?.(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return <>{render({ file, setFile, isLoading, error, handleImport })}</>;
}
