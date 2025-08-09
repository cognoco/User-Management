import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Spinner } from '@/ui/primitives/spinner';
// Data import now goes through backend API route instead of client Supabase

interface DataImportProps {
  onSuccess?: (summary: any) => void;
  onError?: (error: string) => void;
}

const ACCEPTED_FORMATS = ['.json', '.csv'];

const parseFile = async (file: File): Promise<any> => {
  const text = await file.text();
  if (file.name.endsWith('.json')) {
    return JSON.parse(text);
  } else if (file.name.endsWith('.csv')) {
    // Simple CSV to array of objects (for demo; use a library for production)
    const [header, ...rows] = text.split('\n').map(line => line.split(','));
    return rows.map(row => Object.fromEntries(header.map((h, i) => [h, row[i]])));
  }
  throw new Error('Unsupported file format');
};

const DataImport: React.FC<DataImportProps> = ({ onSuccess, onError }) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setFileName(selected ? selected.name : '');
    setError(null);
    setSuccess(false);
    setSummary(null);
  };

  const handleImport = async () => {
    if (!file) {
      setError(t('please select a file to import'));
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setSummary(null);
    try {
      // Parse file
      const data = await parseFile(file);
      // Call backend API or Supabase function
      // For demo: insert into a generic 'imported_data' table
      const resp = await fetch('/api/import-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Import failed');
      setSuccess(true);
      setSummary(result.inserted);
      onSuccess?.(result.inserted);
    } catch (err: any) {
      setError(err.message || t('error importing data'));
      onError?.(err.message || t('error importing data'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.dataImport.title', 'Import Data')}</CardTitle>
        <CardDescription>{t('settings.dataImport.description', 'Upload a JSON or CSV file to import your data.')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="bg-green-50 border-green-200" role="alert">
            <AlertDescription className="text-green-800">
              {t('settings.dataImport.success', 'Data imported successfully!')}
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-3">
          <label htmlFor="import-file" className="block font-medium mb-1">{t('settings.dataImport.selectFile', 'Select file to import')}</label>
          <input
            id="import-file"
            type="file"
            accept={ACCEPTED_FORMATS.join(',')}
            onChange={handleFileChange}
            ref={fileInputRef}
            className="w-full"
            aria-required="true"
          />
          {fileName && <div className="text-sm text-gray-600">{t('selected file')}: {fileName}</div>}
        </div>
        <Button onClick={handleImport} disabled={isLoading || !file} aria-busy={isLoading}>
          {isLoading ? <Spinner size="sm" /> : t('settings.dataImport.importButton', 'Import Data')}
        </Button>
        {summary && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">{t('settings.dataImport.summary', 'Import Summary')}</h4>
            <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto max-h-40">{JSON.stringify(summary, null, 2)}</pre>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="text-xs text-gray-500">{t('settings.dataImport.supportedFormats', 'Supported formats: JSON, CSV')}</div>
      </CardFooter>
    </Card>
  );
};

export default DataImport;
// Props: onSuccess, onError for host integration
// Emits: calls these props on respective actions
// Accessible: all fields labeled, ARIA roles for error/success
// i18n: all text via useTranslation
// Integrates Supabase, supports JSON/CSV import 