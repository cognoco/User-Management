"use client";

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/lib/hooks/use-toast';

export interface AuditLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  user_id: string;
  status_code: number;
  response_time: number;
  error?: string;
  action: string;
  status: string;
}

export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  hasError?: boolean;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  search?: string;
  page: number;
  limit: number;
  sortBy: 'timestamp' | 'status_code' | 'response_time';
  sortOrder: 'asc' | 'desc';
}

export interface AuditLogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogData {
  logs: AuditLog[];
  pagination: AuditLogPagination;
}

export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'pdf';

export type CalendarDate = Date | undefined;

export const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
export const STATUS_CODES = [200, 201, 400, 401, 403, 404, 500];

// Mapping for user-friendly action labels
export const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Login Success',
  LOGIN_FAILURE: 'Login Failure',
  PASSWORD_UPDATE_SUCCESS: 'Password Update Success',
  PASSWORD_UPDATE_FAILURE: 'Password Update Failure',
  ACCOUNT_DELETION_INITIATED: 'Account Deletion Initiated',
  ACCOUNT_DELETION_ERROR: 'Account Deletion Error',
  COMPANY_DATA_EXPORT: 'Company Data Export',
  TEAM_ROLE_UPDATE_SUCCESS: 'Team Role Update Success',
  TEAM_ROLE_UPDATE_FAILURE: 'Team Role Update Failure',
  // Add more as needed
};

// Mapping for status badge color and label
export const STATUS_BADGE: Record<string, { label: string; color: 'success' | 'destructive' | 'warning' | 'default' }> = {
  SUCCESS: { label: 'Success', color: 'success' },
  FAILURE: { label: 'Failure', color: 'destructive' },
  INITIATED: { label: 'Initiated', color: 'warning' },
  COMPLETED: { label: 'Completed', color: 'success' },
};

export interface UseAuditLogViewerProps {
  isAdmin?: boolean;
}

export interface UseAuditLogViewerResult {
  isAdmin: boolean;
  filters: AuditLogFilters;
  isExporting: boolean;
  selectedLog: AuditLog | null;
  isModalOpen: boolean;
  data?: AuditLogData;
  isLoading: boolean;
  error: unknown;
  handleFilterChange: (key: keyof AuditLogFilters, value: any) => void;
  handlePageChange: (newPage: number) => void;
  handleExport: (format: ExportFormat) => Promise<void>;
  handleRowClick: (log: AuditLog) => void;
  handleCloseModal: () => void;
  handleCopyJson: () => void;
}

export function useAuditLogViewer({ isAdmin = true }: UseAuditLogViewerProps): UseAuditLogViewerResult {
  const { toast } = useToast();
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
    sortBy: 'timestamp',
    sortOrder: 'desc',
    search: '',
    resourceType: '',
    resourceId: '',
    ipAddress: '',
    userAgent: '',
  });
  const [isExporting, setIsExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/audit/user-actions?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch audit logs');
      }
      return response.json();
    },
    enabled: isAdmin,
  });

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleExport = async (format: ExportFormat) => {
    try {
      setIsExporting(true);
      
      // Build query parameters from current filters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && !['page', 'limit'].includes(key)) {
          params.append(key, value.toString());
        }
      });
      // Check if we're simulating an error for testing
      if (window.location.search.includes('simulateError=1')) {
        throw new Error('Failed to fetch audit logs');
      }
      
      if (format === 'xlsx') {
        // For Excel format, we'll get an Excel-compatible CSV from the server
        params.append('format', 'xlsx');
        const response = await fetch(`/api/audit/user-actions/export?${params.toString()}`);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to export audit logs');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit-logs.csv'; // Excel can open CSV files
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast({
          title: 'Export Successful',
          description: 'Audit logs have been exported for Excel',
        });
      } else {
        params.append('format', format);
        const response = await fetch(`/api/audit/user-actions/export?${params.toString()}`);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to export audit logs');
        }
        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast({
          title: 'Export Successful',
          description: `Audit logs have been exported as ${format.toUpperCase()}`,
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') { console.error('Export error:', error); }
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export audit logs',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRowClick = (log: AuditLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLog(null);
  };

  const handleCopyJson = useCallback(() => {
    if (selectedLog) {
      navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
      toast({ title: 'Copied', description: 'Log JSON copied to clipboard.' });
    }
  }, [selectedLog, toast]);

  if (error && isAdmin) {
    if (process.env.NODE_ENV === 'development') { console.error('Error:', error); }
    toast({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to fetch audit logs',
      variant: 'destructive',
    });
  }

  return {
    isAdmin,
    filters,
    isExporting,
    selectedLog,
    isModalOpen,
    data,
    isLoading,
    error,
    handleFilterChange,
    handlePageChange,
    handleExport,
    handleRowClick,
    handleCloseModal,
    handleCopyJson
  };
}

export interface HeadlessAuditLogViewerProps extends UseAuditLogViewerProps {
  children: (props: UseAuditLogViewerResult) => React.ReactNode;
}

export function HeadlessAuditLogViewer({ isAdmin = true, children }: HeadlessAuditLogViewerProps) {
  const hookResult = useAuditLogViewer({ isAdmin });
  return <>{children(hookResult)}</>;
}
