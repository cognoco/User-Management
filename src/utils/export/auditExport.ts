/**
 * Audit Log Export Utilities
 * Provides safe export functionality for audit logs in multiple formats
 */

import { AuditLogEntry } from '@/core/audit/models';
import { objectsToCSV } from './csvExport';

/**
 * Export audit logs to CSV format
 */
export function exportToCSV(logs: AuditLogEntry[]): Blob {
  const columns = [
    { key: 'createdAt' as keyof AuditLogEntry, header: 'Timestamp' },
    { key: 'userId' as keyof AuditLogEntry, header: 'User ID' },
    { key: 'action' as keyof AuditLogEntry, header: 'Action' },
    { key: 'status' as keyof AuditLogEntry, header: 'Status' },
    { key: 'ipAddress' as keyof AuditLogEntry, header: 'IP Address' },
    { key: 'userAgent' as keyof AuditLogEntry, header: 'User Agent' },
    { key: 'targetResourceType' as keyof AuditLogEntry, header: 'Resource Type' },
    { key: 'targetResourceId' as keyof AuditLogEntry, header: 'Resource ID' },
    { 
      key: 'details' as keyof AuditLogEntry, 
      header: 'Details',
      format: (val: any) => JSON.stringify(val || {})
    }
  ];
  
  const csv = objectsToCSV(logs, columns);
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Export audit logs to JSON format
 */
export function exportToJSON(logs: AuditLogEntry[]): Blob {
  const json = JSON.stringify(logs, null, 2);
  return new Blob([json], { type: 'application/json;charset=utf-8;' });
}

/**
 * Export audit logs to Excel-compatible CSV format
 * This creates a CSV that Excel can open properly with UTF-8 BOM
 */
export function exportToExcelCSV(logs: AuditLogEntry[]): Blob {
  const columns = [
    { key: 'createdAt' as keyof AuditLogEntry, header: 'Timestamp' },
    { key: 'userId' as keyof AuditLogEntry, header: 'User ID' },
    { key: 'action' as keyof AuditLogEntry, header: 'Action' },
    { key: 'status' as keyof AuditLogEntry, header: 'Status' },
    { key: 'ipAddress' as keyof AuditLogEntry, header: 'IP Address' },
    { key: 'userAgent' as keyof AuditLogEntry, header: 'User Agent' },
    { key: 'targetResourceType' as keyof AuditLogEntry, header: 'Resource Type' },
    { key: 'targetResourceId' as keyof AuditLogEntry, header: 'Resource ID' },
    { 
      key: 'details' as keyof AuditLogEntry, 
      header: 'Details',
      format: (val: any) => JSON.stringify(val || {})
    }
  ];
  
  const csv = objectsToCSV(logs, columns);
  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  return new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Export audit logs to PDF format (returns HTML for now, can be converted to PDF)
 */
export function exportToPDF(logs: AuditLogEntry[]): Blob {
  // For now, return a simple HTML representation that can be printed to PDF
  // In production, you'd use a library like jsPDF or pdfmake
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Audit Log Export</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; }
    h1 { font-size: 18px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .timestamp { white-space: nowrap; }
  </style>
</head>
<body>
  <h1>Audit Log Export - ${new Date().toLocaleDateString()}</h1>
  <p>Total Records: ${logs.length}</p>
  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>User ID</th>
        <th>Action</th>
        <th>Status</th>
        <th>IP Address</th>
        <th>Resource</th>
      </tr>
    </thead>
    <tbody>
      ${logs.map(log => `
        <tr>
          <td class="timestamp">${new Date(log.createdAt).toLocaleString()}</td>
          <td>${log.userId || '-'}</td>
          <td>${log.action}</td>
          <td>${log.status}</td>
          <td>${log.ipAddress || '-'}</td>
          <td>${log.targetResourceType || '-'} ${log.targetResourceId ? `(${log.targetResourceId})` : ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;
  
  return new Blob([html], { type: 'text/html;charset=utf-8;' });
}

/**
 * Main export function that handles all formats
 */
export function exportAuditLogs(
  logs: AuditLogEntry[], 
  format: 'csv' | 'json' | 'xlsx' | 'pdf' = 'json'
): Blob {
  switch (format) {
    case 'csv':
      return exportToCSV(logs);
    case 'xlsx':
      // For Excel, we use a CSV format that Excel can open properly
      return exportToExcelCSV(logs);
    case 'pdf':
      return exportToPDF(logs);
    case 'json':
    default:
      return exportToJSON(logs);
  }
}