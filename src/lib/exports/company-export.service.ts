import { v4 as uuidv4 } from 'uuid';
import { addHours } from 'date-fns';
// Server-only: import supabase dynamically when needed to avoid client bundling
async function getServerSupabase() {
  const { getServiceSupabase } = await import('@/lib/database/supabase');
  return getServiceSupabase();
}
import { sendEmail } from '@/lib/email/sendEmail';
import { logUserAction } from '@/lib/audit/auditLogger';
import Papa from 'papaparse';
import {
  ExportFormat,
  ExportStatus,
  DataExportStorageBucket,
  ExportOptions,
  CompanyDataExport,
  CompanyExportData,
  DataExportResponse
} from './types';

// Default options for exports
const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: ExportFormat.JSON,
  isLargeDataset: false,
  expiryHours: 24
};

// Large dataset threshold in bytes (5MB)
const LARGE_DATASET_THRESHOLD = 5 * 1024 * 1024;

// Rate limit - time between exports (minutes)
const EXPORT_RATE_LIMIT_MINUTES = 15;

/**
 * Check if the company has recently requested an export (rate limiting)
 * @param companyId Company ID to check
 * @returns Boolean indicating if company is rate limited
 */
export async function isCompanyRateLimited(companyId: string): Promise<boolean> {
  const supabase = await getServerSupabase();
  const rateWindowDate = new Date();
  rateWindowDate.setMinutes(rateWindowDate.getMinutes() - EXPORT_RATE_LIMIT_MINUTES);
  
  const { count, error } = await supabase
    .from('company_data_exports')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', rateWindowDate.toISOString());
  
  if (error) {
    console.error('Error checking company rate limit:', error);
    return false; // Fail open if we can't check
  }
  
  return count !== null && count > 0;
}

/**
 * Create a new pending company data export record
 * @param companyId Company ID requesting export
 * @param userId User ID requesting export
 * @param options Export options
 * @returns Created export record
 */
export async function createCompanyDataExport(
  companyId: string,
  userId: string,
  options: Partial<ExportOptions> = {}
): Promise<CompanyDataExport | null> {
  try {
    const supabase = await getServerSupabase();
    const exportOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };
    const expiresAt = addHours(new Date(), exportOptions.expiryHours || 24);
    
    const { data, error } = await supabase
      .from('company_data_exports')
      .insert({
        company_id: companyId,
        user_id: userId,
        format: exportOptions.format,
        status: ExportStatus.PENDING,
        download_token: uuidv4(),
        expires_at: expiresAt.toISOString(),
        is_large_dataset: exportOptions.isLargeDataset
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      companyId: data.company_id,
      userId: data.user_id,
      format: data.format,
      status: data.status,
      filePath: data.file_path,
      downloadToken: data.download_token,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      completedAt: data.completed_at,
      expiresAt: data.expires_at,
      errorMessage: data.error_message,
      fileSizeBytes: data.file_size_bytes,
      isLargeDataset: data.is_large_dataset,
      notificationSent: data.notification_sent
    };
  } catch (error) {
    console.error('Error creating company data export:', error);
    return null;
  }
}

/**
 * Process a company export immediately (for small datasets)
 * @param exportId Export ID to process
 * @param companyId Company ID
 * @param userId User ID who requested the export
 */
export async function processCompanyDataExport(
  exportId: string,
  companyId: string,
  userId: string
): Promise<void> {
  try {
    const supabase = await getServerSupabase();
    // Get export record to determine format
    const exportRecord = await getCompanyDataExportById(exportId);
    if (!exportRecord) throw new Error('Export record not found');
    
    // Update status to processing
    await supabase
      .from('company_data_exports')
      .update({
        status: ExportStatus.PROCESSING,
        updated_at: new Date().toISOString()
      })
      .eq('id', exportId);
    
    // Get company data
    const companyData = await getCompanyExportData(companyId);
    
    // Determine if this is a large dataset
    const dataString = JSON.stringify(companyData);
    const isLargeDataset = dataString.length > LARGE_DATASET_THRESHOLD;
    
    // Convert to requested format (JSON or CSV)
    let fileContent: string;
    let fileExtension: string;
    let contentType: string;
    
    if (exportRecord.format === ExportFormat.CSV) {
      // Flatten the data structure for CSV export
      const flatData = flattenCompanyDataForCsv(companyData);
      fileContent = Papa.unparse(flatData);
      fileExtension = '.csv';
      contentType = 'text/csv';
    } else {
      // Default to JSON
      fileContent = dataString;
      fileExtension = '.json';
      contentType = 'application/json';
    }
    
    // Generate unique filename
    const filename = `company_export_${companyId}_${new Date().toISOString().replace(/[:.]/g, '-')}${fileExtension}`;
    const filePath = `${companyId}/${filename}`;
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(DataExportStorageBucket.COMPANY_EXPORTS)
      .upload(filePath, fileContent, {
        contentType,
        upsert: true
      });
    
    if (uploadError) throw uploadError;
    
    // Update export record
    await supabase
      .from('company_data_exports')
      .update({
        status: ExportStatus.COMPLETED,
        file_path: filePath,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        file_size_bytes: fileContent.length,
        is_large_dataset: isLargeDataset
      })
      .eq('id', exportId);
    
    // Log the export action
    await logUserAction({
      userId,
      action: 'COMPANY_DATA_EXPORT',
      status: 'SUCCESS',
      targetResourceType: 'company',
      targetResourceId: companyId,
      details: { exportId, filePath, format: exportRecord.format }
    });
  } catch (error) {
    console.error('Error processing company data export:', error);
    
    // Update export record with error
    await supabase
      .from('company_data_exports')
      .update({
        status: ExportStatus.FAILED,
        error_message: error instanceof Error ? error.message : 'Unknown error during export',
        updated_at: new Date().toISOString()
      })
      .eq('id', exportId);
    
    // Log the failed export
    await logUserAction({
      userId,
      action: 'COMPANY_DATA_EXPORT',
      status: 'FAILURE',
      targetResourceType: 'company',
      targetResourceId: companyId,
      details: { exportId, error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
}

/**
 * Helper function to flatten company data for CSV export
 * @param companyData Company data to flatten
 * @returns Array of flattened records for CSV export
 */
function flattenCompanyDataForCsv(companyData: CompanyExportData): Array<Record<string, any>> {
  const flatRecords: Array<Record<string, any>> = [];
  
  // Add company profile as the first record
  if (companyData.companyProfile) {
    const profileRecord = {
      record_type: 'company_profile',
      ...flattenObject(companyData.companyProfile)
    };
    flatRecords.push(profileRecord);
  }
  
  // Add company members
  if (companyData.companyMembers && companyData.companyMembers.length > 0) {
    companyData.companyMembers.forEach((member, index) => {
      const memberRecord = {
        record_type: 'company_member',
        member_index: index,
        ...flattenObject(member)
      };
      flatRecords.push(memberRecord);
    });
  }
  
  // Add company roles
  if (companyData.companyRoles && companyData.companyRoles.length > 0) {
    companyData.companyRoles.forEach((role, index) => {
      const roleRecord = {
        record_type: 'company_role',
        role_index: index,
        ...flattenObject(role)
      };
      flatRecords.push(roleRecord);
    });
  }
  
  // Add activity logs
  if (companyData.activityLogs && companyData.activityLogs.length > 0) {
    companyData.activityLogs.forEach((log, index) => {
      const logRecord = {
        record_type: 'activity_log',
        log_index: index,
        ...flattenObject(log)
      };
      flatRecords.push(logRecord);
    });
  }
  
  return flatRecords;
}

/**
 * Recursively flatten a nested object into dot notation
 * @param obj Object to flatten
 * @param prefix Current prefix for the dot notation
 * @returns Flattened object
 */
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // Recursively flatten nested objects
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else if (Array.isArray(obj[key])) {
        // Convert arrays to string representation
        flattened[newKey] = JSON.stringify(obj[key]);
      } else {
        // Add simple values
        flattened[newKey] = obj[key];
      }
    }
  }
  
  return flattened;
}

/**
 * Send company export completion notification email
 * @param exportId Export ID
 * @param userId User ID who requested the export
 * @param userEmail User email
 */
export async function sendCompanyExportNotification(
  exportId: string,
  userId: string,
  userEmail: string
): Promise<boolean> {
  try {
    // Get export details
    const supabase = await getServerSupabase();
    const { data: export_, error } = await supabase
      .from('company_data_exports')
      .select('*, company_profiles:company_id!inner(name)')
      .eq('id', exportId)
      .single();
    
    if (error || !export_) throw error || new Error('Export not found');
    
    // Get download URL
    const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/export/download?token=${export_.download_token}`;
    
    // Calculate expiry time in readable format
    const expiryDate = new Date(export_.expires_at);
    const formattedExpiryDate = expiryDate.toLocaleString();
    
    // Get company name
    const companyName = export_.company_profiles?.name || 'your company';
    
    // Send email
    const emailResult = await sendEmail({
      to: userEmail,
      subject: `${companyName} Data Export is Ready`,
      html: `
        <h2>${companyName} Data Export is Ready</h2>
        <p>Your requested company data export is now ready for download.</p>
        <p><a href="${downloadUrl}">Click here to download your data</a></p>
        <p>This download link will expire on ${formattedExpiryDate}.</p>
        <p>If you did not request this export, you can safely ignore this email.</p>
      `
    });
    
    // Update notification status
    await supabase
      .from('company_data_exports')
      .update({
        notification_sent: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', exportId);
    
    return !!emailResult;
  } catch (error) {
    console.error('Error sending company export notification:', error);
    return false;
  }
}

/**
 * Get company data export by token
 * @param token Download token
 * @returns Export record if found and valid
 */
export async function getCompanyDataExportByToken(token: string): Promise<CompanyDataExport | null> {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('company_data_exports')
      .select('*')
      .eq('download_token', token)
      .eq('status', ExportStatus.COMPLETED)
      .lt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) return null;
    
    return {
      id: data.id,
      companyId: data.company_id,
      userId: data.user_id,
      format: data.format,
      status: data.status,
      filePath: data.file_path,
      downloadToken: data.download_token,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      completedAt: data.completed_at,
      expiresAt: data.expires_at,
      errorMessage: data.error_message,
      fileSizeBytes: data.file_size_bytes,
      isLargeDataset: data.is_large_dataset,
      notificationSent: data.notification_sent
    };
  } catch (error) {
    console.error('Error getting company data export by token:', error);
    return null;
  }
}

/**
 * Get company data export by ID
 * @param exportId Export ID
 * @returns Export record if found
 */
export async function getCompanyDataExportById(exportId: string): Promise<CompanyDataExport | null> {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('company_data_exports')
      .select('*')
      .eq('id', exportId)
      .single();
    
    if (error || !data) return null;
    
    return {
      id: data.id,
      companyId: data.company_id,
      userId: data.user_id,
      format: data.format,
      status: data.status,
      filePath: data.file_path,
      downloadToken: data.download_token,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      completedAt: data.completed_at,
      expiresAt: data.expires_at,
      errorMessage: data.error_message,
      fileSizeBytes: data.file_size_bytes,
      isLargeDataset: data.is_large_dataset,
      notificationSent: data.notification_sent
    };
  } catch (error) {
    console.error('Error getting company data export by ID:', error);
    return null;
  }
}

/**
 * Get company data export download URL
 * @param filePath File path in storage
 * @returns Download URL
 */
export async function getCompanyExportDownloadUrl(filePath: string): Promise<string> {
  // Public URL helper: use server client on demand
  const supabase = await getServerSupabase();
  const { data } = supabase.storage
    .from(DataExportStorageBucket.COMPANY_EXPORTS)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * Get all data for a company export
 * @param companyId Company ID
 * @returns Company data for export
 */
export async function getCompanyExportData(companyId: string): Promise<CompanyExportData> {
  // Get company profile
  const supabase = await getServerSupabase();
  const { data: companyProfile } = await supabase
    .from('company_profiles')
    .select('*, company_addresses(*)')
    .eq('id', companyId)
    .single();
  
  // Get company members (excluding sensitive information)
  const { data: companyMembers } = await supabase
    .from('company_members')
    .select(`
      id, 
      role, 
      status, 
      created_at, 
      updated_at,
      users:user_id (
        id,
        email,
        last_sign_in_at,
        created_at
      )
    `)
    .eq('company_id', companyId);
  
  // Get company roles
  const { data: companyRoles } = await supabase
    .from('company_roles')
    .select('*')
    .eq('company_id', companyId);
  
  // Get company activity logs
  const { data: activityLogs } = await supabase
    .from('user_actions_log')
    .select('*')
    .eq('target_resource_type', 'company')
    .eq('target_resource_id', companyId)
    .order('created_at', { ascending: false });
  
  // Return export data (filtering out any security-sensitive fields)
  return {
    companyProfile: companyProfile || null,
    companyMembers: companyMembers || [],
    companyRoles: companyRoles || [],
    activityLogs: activityLogs || []
  };
}

/**
 * Check company export status
 * @param exportId Export ID
 * @returns Status response object
 */
export async function checkCompanyExportStatus(exportId: string): Promise<DataExportResponse> {
  const exportData = await getCompanyDataExportById(exportId);
  
  if (!exportData) {
    return {
      id: exportId,
      status: ExportStatus.FAILED,
      isLargeDataset: false,
      message: 'Export not found',
      format: ExportFormat.JSON
    };
  }
  
  let message = '';
  let downloadUrl;
  
  switch (exportData.status) {
    case ExportStatus.PENDING:
      message = 'Your export is pending processing';
      break;
    case ExportStatus.PROCESSING:
      message = 'Your export is being processed';
      break;
    case ExportStatus.COMPLETED:
      message = 'Your export is ready for download';
      if (exportData.filePath) {
        downloadUrl = getCompanyExportDownloadUrl(exportData.filePath);
      }
      break;
    case ExportStatus.FAILED:
      message = `Export failed: ${exportData.errorMessage || 'Unknown error'}`;
      break;
  }
  
  return {
    id: exportData.id,
    status: exportData.status,
    isLargeDataset: exportData.isLargeDataset,
    message,
    downloadUrl,
    format: exportData.format
  };
} 