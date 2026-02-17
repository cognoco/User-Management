/**
 * Headless Backup Codes Display Component
 * 
 * This component handles the behavior of backup codes display without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { api } from '@/lib/api/axios';

export interface BackupCodesDisplayProps {
  /**
   * Backup codes to display
   */
  codes: string[];
  
  /**
   * Called when user requests new backup codes
   */
  onGenerateNewCodes?: () => void;
  
  /**
   * Called when user downloads backup codes
   */
  onDownload?: () => void;
  
  /**
   * Called when user prints backup codes
   */
  onPrint?: () => void;
  
  /**
   * Called when user copies backup codes
   */
  onCopy?: () => void;
  
  /**
   * Custom loading state (if not provided, internal state is used)
   */
  isLoading?: boolean;
  
  /**
   * Custom error message (if not provided, internal state is used)
   */
  error?: string;
  
  /**
   * Render prop function that receives backup codes state and handlers
   */
  render: (props: {
    codes: string[];
    handleGenerateNewCodes: () => void;
    handleDownload: () => void;
    handlePrint: () => void;
    handleCopy: () => void;
    isCopied: boolean;
    isLoading: boolean;
    error?: string;
  }) => React.ReactNode;
}

export function BackupCodesDisplay({
  codes,
  onGenerateNewCodes,
  onDownload,
  onPrint,
  onCopy,
  isLoading: externalIsLoading,
  error: externalError,
  render
}: BackupCodesDisplayProps) {
  // Get authentication hook
  const { isLoading: authIsLoading, error: authError } = useAuth();
  const generateBackupCodes = async (): Promise<string[]> => {
    const res = await api.post('/auth/mfa/backup-codes/regenerate');
    const data = res.data as { success: boolean; backupCodes?: string[] };
    return data.backupCodes ?? [];
  };
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isSubmitting;
  const formError = externalError !== undefined ? externalError : authError || error;
  
  // Handle generate new codes
  const handleGenerateNewCodes = async () => {
    setError(undefined);
    setIsSubmitting(true);
    
    try {
      if (onGenerateNewCodes) {
        // Use custom handler
        onGenerateNewCodes();
      } else {
        // Use default auth hook
        await generateBackupCodes();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate new backup codes';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle download
  const handleDownload = () => {
    // Create a text file with backup codes
    const content = `BACKUP CODES - KEEP THESE SAFE\n\n${codes.join('\n')}\n\nEach code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link and trigger it
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Notify parent
    onDownload?.();
  };
  
  // Handle print
  const handlePrint = () => {
    // Create a printable document
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Backup Codes</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              h1 { font-size: 18px; }
              ul { list-style-type: none; padding: 0; }
              li { font-family: monospace; font-size: 16px; margin-bottom: 8px; }
              p { font-size: 14px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>Backup Codes - Keep These Safe</h1>
            <ul>
              ${codes.map(code => `<li>${code}</li>`).join('')}
            </ul>
            <p>Each code can only be used once.</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    
    // Notify parent
    onPrint?.();
  };
  
  // Handle copy
  const handleCopy = async () => {
    try {
      // Copy codes to clipboard
      const content = `${codes.join('\n')}`;
      await navigator.clipboard.writeText(content);
      
      // Show copied indicator
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      
      // Notify parent
      onCopy?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy backup codes';
      setError(errorMessage);
    }
  };
  
  // Render the component using the render prop
  return render({
    codes,
    handleGenerateNewCodes,
    handleDownload,
    handlePrint,
    handleCopy,
    isCopied,
    isLoading,
    error: formError
  });
}

export default BackupCodesDisplay;
