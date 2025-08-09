import { useEffect, useState, useRef } from 'react';
// Removed direct Supabase dependency – uses storage API routes

/**
 * Headless File Manager
 *
 * Provides the behaviour of the FileManager component without UI rendering.
 */
interface FileItem {
  name: string;
  id?: string;
  metadata?: {
    size?: number;
    mimetype?: string;
  };
}

export interface FileManagerProps {
  bucket?: string;
  initialPath?: string;
  allowFolders?: boolean;
  onFileUpload?: (file: File, path: string) => void;
  onFileDelete?: (file: FileItem) => void;
  onFileRename?: (oldName: string, newName: string) => void;
  render: (props: {
    files: FileItem[];
    loading: boolean;
    error: string | null;
    uploading: boolean;
    uploadError: string | null;
    currentPath: string;
    deleteDialog: { open: boolean; file?: FileItem };
    renameDialog: { open: boolean; file?: FileItem };
    renameValue: string;
    fetchFiles: () => Promise<void>;
    handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    getDownloadUrl: (file: FileItem) => string;
    handleDelete: () => Promise<void>;
    handleRename: () => Promise<void>;
    handleNavigate: (folder: string) => void;
    handleBreadcrumbClick: (index: number) => void;
    setDeleteDialog: (state: { open: boolean; file?: FileItem }) => void;
    setRenameDialog: (state: { open: boolean; file?: FileItem }) => void;
    setRenameValue: (val: string) => void;
  }) => React.ReactNode;
}

const DEFAULT_BUCKET = 'files';

export default function FileManager({
  bucket = DEFAULT_BUCKET,
  initialPath = '',
  allowFolders = true,
  onFileUpload,
  onFileDelete,
  onFileRename,
  render
}: FileManagerProps) {
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

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/storage/files');
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Failed to list files');
      setFiles(json.files || []);
    } catch (err: any) {
      setError(err.message);
      setFiles([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, [currentPath, bucket]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const path = currentPath ? `${currentPath}/${file.name}` : file.name;
    try {
      const form = new FormData();
      form.append('file', file);
      const resp = await fetch('/api/storage/upload', { method: 'POST', body: form });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Upload failed');
      onFileUpload?.(file, path);
      fetchFiles();
    } catch (err: any) {
      setUploadError(err.message);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getDownloadUrl = (file: FileItem) => {
    const path = currentPath ? `${currentPath}/${file.name}` : file.name;
    return `/api/storage/file-url?path=${encodeURIComponent(path)}`;
  };

  const handleDelete = async () => {
    if (!deleteDialog.file) return;
    const path = currentPath ? `${currentPath}/${deleteDialog.file.name}` : deleteDialog.file.name;
    try {
      const resp = await fetch('/api/storage/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Delete failed');
      onFileDelete?.(deleteDialog.file);
      fetchFiles();
    } catch (err: any) {
      setError(err.message);
    }
    setDeleteDialog({ open: false });
  };

  const handleRename = async () => {
    if (!renameDialog.file || !renameValue) return;
    const oldPath = currentPath ? `${currentPath}/${renameDialog.file.name}` : renameDialog.file.name;
    const newPath = currentPath ? `${currentPath}/${renameValue}` : renameValue;
    try {
      const resp = await fetch('/api/storage/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Rename failed');
      onFileRename?.(renameDialog.file.name, renameValue);
      fetchFiles();
    } catch (err: any) {
      setError(err.message);
    }
    setRenameDialog({ open: false });
    setRenameValue('');
  };

  const handleNavigate = (folder: string) => {
    if (!allowFolders) return;
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

  return (
    <>{render({
      files,
      loading,
      error,
      uploading,
      uploadError,
      currentPath,
      deleteDialog,
      renameDialog,
      renameValue,
      fetchFiles,
      handleUpload,
      getDownloadUrl,
      handleDelete,
      handleRename,
      handleNavigate,
      handleBreadcrumbClick,
      setDeleteDialog,
      setRenameDialog,
      setRenameValue
    })}</>
  );
}
