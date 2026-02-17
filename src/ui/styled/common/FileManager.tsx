import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/database/supabase';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/primitives/button';
import { Spinner } from '@/ui/primitives/spinner';
import { Alert, AlertTitle, AlertDescription } from '@/ui/primitives/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/ui/primitives/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/ui/primitives/alert-dialog';
import { Label } from '@/ui/primitives/label';
import { Input } from '@/ui/primitives/input';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/ui/primitives/breadcrumb';
import FileTypeIcon from '@/ui/primitives/FileTypeIcon';
import { formatFileSize } from '@/lib/utils/file-upload';

/**
 * FileManager Component
 *
 * Props:
 *   onFileUpload?: (file: File, path: string) => void
 *   onFileDelete?: (file: FileItem) => void
 *   onFileRename?: (oldName: string, newName: string) => void
 *   bucket?: string (default: 'files')
 *   initialPath?: string (default: '')
 *   allowFolders?: boolean (default: true)
 *   ...future config
 *
 * Emits events/calls props for integration with host app.
 */

interface FileItem {
  name: string;
  id?: string;
  metadata?: {
    size?: number;
    mimetype?: string;
  };
}

interface FileManagerProps {
  onFileUpload?: (file: File, path: string) => void;
  onFileDelete?: (file: FileItem) => void;
  onFileRename?: (oldName: string, newName: string) => void;
  bucket?: string;
  initialPath?: string;
  allowFolders?: boolean;
}

const DEFAULT_BUCKET = 'files';

const FileManager: React.FC<FileManagerProps> = ({
  onFileUpload,
  onFileDelete,
  onFileRename,
  bucket = DEFAULT_BUCKET,
  initialPath = '',
  allowFolders = true,
}) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; file?: FileItem }>({ open: false });
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; file?: FileItem }>({ open: false });
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch files/folders
  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.storage.from(bucket).list(currentPath, { limit: 100, offset: 0 });
    if (error) {
      setError(error.message || t('fileManager.errorLoadingFiles', 'Error loading files'));
      setFiles([]);
    } else {
      setFiles(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, bucket]);

  // Upload handler
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const path = currentPath ? `${currentPath}/${file.name}` : file.name;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) {
      setUploadError(error.message || t('fileManager.errorUploading', 'Error uploading file'));
    } else {
      onFileUpload?.(file, path);
      fetchFiles();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download handler
  const getDownloadUrl = (file: FileItem) => {
    const path = currentPath ? `${currentPath}/${file.name}` : file.name;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || '#';
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteDialog.file) return;
    const path = currentPath ? `${currentPath}/${deleteDialog.file.name}` : deleteDialog.file.name;
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      setError(error.message || t('fileManager.errorDeleting', 'Error deleting file'));
    } else {
      onFileDelete?.(deleteDialog.file);
      fetchFiles();
    }
    setDeleteDialog({ open: false });
  };

  // Rename handler
  const handleRename = async () => {
    if (!renameDialog.file || !renameValue) return;
    const oldPath = currentPath ? `${currentPath}/${renameDialog.file.name}` : renameDialog.file.name;
    const newPath = currentPath ? `${currentPath}/${renameValue}` : renameValue;
    const { error } = await supabase.storage.from(bucket).move(oldPath, newPath);
    if (error) {
      setError(error.message || t('fileManager.errorRenaming', 'Error renaming file'));
    } else {
      onFileRename?.(renameDialog.file.name, renameValue);
      fetchFiles();
    }
    setRenameDialog({ open: false });
    setRenameValue('');
  };

  // Folder navigation
  const handleNavigate = (folder: string) => {
    setCurrentPath(currentPath ? `${currentPath}/${folder}` : folder);
  };
  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setCurrentPath('');
    } else {
      const parts = currentPath.split('/').filter(Boolean).slice(0, index + 1);
      setCurrentPath(parts.join('/'));
    }
  };

  // Accessibility: focus management for dialogs
  useEffect(() => {
    if (renameDialog.open && renameDialog.file) {
      setRenameValue(renameDialog.file.name);
    }
  }, [renameDialog]);

  // Render
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{t('fileManager.title', 'File Manager')}</h2>
      {/* Upload */}
      <div className="mb-4 flex items-center gap-4">
        <Label htmlFor="file-upload">{t('fileManager.uploadFile', 'Upload File')}</Label>
        <Input
          id="file-upload"
          ref={fileInputRef}
          type="file"
          aria-label={t('fileManager.uploadFile', 'Upload File')}
          onChange={handleUpload}
          disabled={uploading}
          className="max-w-xs"
        />
        {uploading && (
          <div className="flex items-center gap-2">
            <Spinner size="sm" />
            <span>{t('fileManager.uploading', 'Uploading...')}</span>
          </div>
        )}
      </div>
      {uploadError && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>{t('common.error', 'Error')}</AlertTitle>
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
      {/* Breadcrumb */}
      {allowFolders && (
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button type="button" onClick={() => handleBreadcrumbClick(-1)} className="text-primary font-medium">
                  {t('fileManager.home', 'Home')}
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {currentPath.split('/').filter(Boolean).map((part, idx, arr) => (
              <React.Fragment key={part + idx}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {idx === arr.length - 1 ? (
                    <BreadcrumbPage className="active-folder">{part}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <button type="button" onClick={() => handleBreadcrumbClick(idx)}>{part}</button>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      {/* File list */}
      <div role="region" aria-live="polite">
        {loading ? (
          <div className="flex items-center gap-2"><Spinner /> <span>{t('fileManager.loading', 'Loading...')}</span></div>
        ) : error ? (
          <Alert variant="destructive" role="alert">
            <AlertTitle>{t('common.error', 'Error')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button variant="outline" onClick={fetchFiles} className="mt-2">{t('fileManager.retry', 'Retry')}</Button>
          </Alert>
        ) : files.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">{t('fileManager.noFiles', 'No files')}</div>
        ) : (
          <ul className="divide-y border rounded-md">
            {files.map((file) => {
              const isFolder = file.name.endsWith('/') || file.metadata?.mimetype === 'inode/directory';
              return (
                <li key={file.name} className="flex items-center gap-3 px-4 py-2 group">
                  <span>
                    <FileTypeIcon filename={file.name} mimeType={file.metadata?.mimetype} />
                  </span>
                  <span className="flex-1 truncate">
                    {isFolder ? (
                      <button
                        type="button"
                        className="text-primary font-medium hover:underline"
                        onClick={() => handleNavigate(file.name.replace(/\/$/, ''))}
                        aria-label={t('fileManager.openFolder', { folder: file.name, defaultValue: 'Open folder {{folder}}' })}
                      >
                        {file.name}
                      </button>
                    ) : (
                      file.name
                    )}
                  </span>
                  {!isFolder && (
                    <>
                      <span className="text-xs text-muted-foreground min-w-[60px] text-right">
                        {file.metadata?.size ? formatFileSize(file.metadata.size) : ''}
                      </span>
                      <a
                        href={getDownloadUrl(file)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-primary underline"
                        role="link"
                        aria-label={t('fileManager.download', { file: file.name, defaultValue: 'Download {{file}}' })}
                      >
                        {t('fileManager.download', 'Download')}
                      </a>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={t('fileManager.rename', { file: file.name, defaultValue: 'Rename {{file}}' })}
                        onClick={() => setRenameDialog({ open: true, file })}
                      >
                        {t('fileManager.rename', 'Rename')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        aria-label={t('fileManager.delete', { file: file.name, defaultValue: 'Delete {{file}}' })}
                        onClick={() => setDeleteDialog({ open: true, file })}
                      >
                        {t('fileManager.delete', 'Delete')}
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={open => setDeleteDialog({ open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('fileManager.confirmDelete', 'Confirm Deletion')}</AlertDialogTitle>
          </AlertDialogHeader>
          <div>{t('fileManager.confirmDeleteMessage', { file: deleteDialog.file?.name, defaultValue: 'Are you sure you want to delete {{file}}?' })}</div>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline">{t('common.cancel', 'Cancel')}</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button type="button" variant="destructive" onClick={handleDelete}>{t('common.confirm', 'Confirm')}</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Rename dialog */}
      <Dialog open={renameDialog.open} onOpenChange={open => setRenameDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('fileManager.renameFile', 'Rename File')}</DialogTitle>
          </DialogHeader>
          <Label htmlFor="rename-input">{t('fileManager.newName', 'New Name')}</Label>
          <Input
            id="rename-input"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            aria-label={t('fileManager.newName', 'New Name')}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenameDialog({ open: false })}>{t('common.cancel', 'Cancel')}</Button>
            <Button type="button" onClick={handleRename}>{t('common.save', 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileManager; 