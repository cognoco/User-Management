import { v4 as uuidv4 } from 'uuid';
import { addHours } from 'date-fns';
import { getServiceSupabase } from '@/lib/database/supabase';
import { sendEmail } from '@/lib/email/sendEmail';
import { logUserAction } from '@/lib/audit/auditLogger';
import Papa from 'papaparse';
import {
  ExportFormat,
  ExportStatus,
  DataExportStorageBucket,
  ExportOptions,
  UserDataExport,
  UserExportData,
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
 * Check if the user has recently requested an export (rate limiting)
 * @param userId User ID to check
 * @returns Boolean indicating if user is rate limited
 */
export async function isUserRateLimited(userId: string): Promise<boolean> {
  const rateWindowDate = new Date();
  rateWindowDate.setMinutes(rateWindowDate.getMinutes() - EXPORT_RATE_LIMIT_MINUTES);
  
  const supabase = getServiceSupabase();
  const { count, error } = await supabase
    .from('user_data_exports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', rateWindowDate.toISOString());
  
  if (error) {
    console.error('Error checking rate limit:', error);
    return false; // Fail open if we can't check
  }
  
  return count !== null && count > 0;
}

/**
 * Create a new pending user data export record
 * @param userId User ID requesting export
 * @param options Export options
 * @returns Created export record
 */
export async function createUserDataExport(
  userId: string,
  options: Partial<ExportOptions> = {}
): Promise<UserDataExport | null> {
  try {
    const exportOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };
    const expiresAt = addHours(new Date(), exportOptions.expiryHours || 24);
    
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('user_data_exports')
      .insert({
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
    console.error('Error creating user data export:', error);
    return null;
  }
}

/**
 * Process an export immediately (for small datasets)
 * @param exportId Export ID to process
 * @param userId User ID
 */
export async function processUserDataExport(exportId: string, userId: string): Promise<void> {
  try {
    // Get export record to determine format
    const exportRecord = await getUserDataExportById(exportId);
    if (!exportRecord) throw new Error('Export record not found');
    
    // Update status to processing
    const supabase = getServiceSupabase();
    await supabase
      .from('user_data_exports')
      .update({
        status: ExportStatus.PROCESSING,
        updated_at: new Date().toISOString()
      })
      .eq('id', exportId);
    
    // Get user data
    const userData = await getUserExportData(userId);
    
    // Determine if this is a large dataset
    const dataString = JSON.stringify(userData);
    const isLargeDataset = dataString.length > LARGE_DATASET_THRESHOLD;
    
    // Convert to requested format (JSON or CSV)
    let fileContent: string;
    let fileExtension: string;
    let contentType: string;
    
    if (exportRecord.format === ExportFormat.CSV) {
      // Flatten the data structure for CSV export
      const flatData = flattenUserDataForCsv(userData);
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
    const filename = `user_export_${userId}_${new Date().toISOString().replace(/[:.]/g, '-')}${fileExtension}`;
    const filePath = `${userId}/${filename}`;
    
    // Upload to storage
    const supabase2 = getServiceSupabase();
    const { error: uploadError } = await supabase2.storage
      .from(DataExportStorageBucket.USER_EXPORTS)
      .upload(filePath, fileContent, {
        contentType,
        upsert: true
      });
    
    if (uploadError) throw uploadError;
    
    // Update export record
    const supabase3 = getServiceSupabase();
    await supabase3
      .from('user_data_exports')
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
      action: 'USER_DATA_EXPORT',
      status: 'SUCCESS',
      targetResourceType: 'user',
      targetResourceId: userId,
      details: { exportId, filePath, format: exportRecord.format }
    });
  } catch (error) {
    console.error('Error processing user data export:', error);
    
    // Update export record with error
    const supabase = getServiceSupabase();
    await supabase
      .from('user_data_exports')
      .update({
        status: ExportStatus.FAILED,
        error_message: error instanceof Error ? error.message : 'Unknown error during export',
        updated_at: new Date().toISOString()
      })
      .eq('id', exportId);
    
    // Log the failed export
    await logUserAction({
      userId,
      action: 'USER_DATA_EXPORT',
      status: 'FAILURE',
      targetResourceType: 'user',
      targetResourceId: userId,
      details: { exportId, error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
}

/**
 * Helper function to flatten user data for CSV export
 * @param userData User data to flatten
 * @returns Array of flattened records for CSV export
 */
function flattenUserDataForCsv(userData: UserExportData): Array<Record<string, any>> {
  const flatRecords: Array<Record<string, any>> = [];
  
  // Add profile as the first record
  if (userData.profile) {
    const profileRecord = {
      record_type: 'profile',
      ...flattenObject(userData.profile)
    };
    flatRecords.push(profileRecord);
  }
  
  // Add preferences
  if (userData.preferences) {
    const preferencesRecord = {
      record_type: 'preferences',
      ...flattenObject(userData.preferences)
    };
    flatRecords.push(preferencesRecord);
  }
  
  // Add activity logs
  if (userData.activityLogs && userData.activityLogs.length > 0) {
    userData.activityLogs.forEach((log, index) => {
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
 * Send export completion notification email
 * @param exportId Export ID
 * @param userId User ID
 * @param userEmail User email
 */
export async function sendExportNotification(
  exportId: string,
  userId: string,
  userEmail: string
): Promise<boolean> {
  try {
    // Get export details
    const supabase = getServiceSupabase();
    const { data: export_, error } = await supabase
      .from('user_data_exports')
      .select('*')
      .eq('id', exportId)
      .single();
    
    if (error || !export_) throw error || new Error('Export not found');
    
    // Get download URL
    const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/profile/export/download?token=${export_.download_token}`;
    
    // Calculate expiry time in readable format
    const expiryDate = new Date(export_.expires_at);
    const formattedExpiryDate = expiryDate.toLocaleString();
    
    // Send email
    const emailResult = await sendEmail({
      to: userEmail,
      subject: 'Your Data Export is Ready',
      html: `
        <h2>Your Data Export is Ready</h2>
        <p>Your requested data export is now ready for download.</p>
        <p><a href="${downloadUrl}">Click here to download your data</a></p>
        <p>This download link will expire on ${formattedExpiryDate}.</p>
        <p>If you did not request this export, you can safely ignore this email.</p>
      `
    });
    
    // Update notification status
    const supabase2 = getServiceSupabase();
    await supabase2
      .from('user_data_exports')
      .update({
        notification_sent: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', exportId);
    
    return !!emailResult;
  } catch (error) {
    console.error('Error sending export notification:', error);
    return false;
  }
}

/**
 * Get user data export by token
 * @param token Download token
 * @returns Export record if found and valid
 */
export async function getUserDataExportByToken(token: string): Promise<UserDataExport | null> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('user_data_exports')
      .select('*')
      .eq('download_token', token)
      .eq('status', ExportStatus.COMPLETED)
      .lt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) return null;
    
    return {
      id: data.id,
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
    console.error('Error getting user data export by token:', error);
    return null;
  }
}

/**
 * Get user data export by ID
 * @param exportId Export ID
 * @returns Export record if found
 */
export async function getUserDataExportById(exportId: string): Promise<UserDataExport | null> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('user_data_exports')
      .select('*')
      .eq('id', exportId)
      .single();
    
    if (error || !data) return null;
    
    return {
      id: data.id,
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
    console.error('Error getting user data export by ID:', error);
    return null;
  }
}

/**
 * Get user data export download URL
 * @param filePath File path in storage
 * @returns Download URL
 */
export function getUserExportDownloadUrl(filePath: string): string {
  const supabase = getServiceSupabase();
  const { data } = supabase.storage
    .from(DataExportStorageBucket.USER_EXPORTS)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * Get all data for a user export
 * @param userId User ID
 * @returns User data for export
 */
export async function getUserExportData(userId: string): Promise<UserExportData> {
  // Get profile data
  const supabase = getServiceSupabase();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('userId', userId)
    .single();
  
  // Get user preferences
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  // Get user activity log
  const { data: activityLogs } = await supabase
    .from('user_actions_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  // Return export data
  return {
    profile: profile || null,
    preferences: preferences || null,
    activityLogs: activityLogs || []
  };
}

/**
 * Check user export status
 * @param exportId Export ID
 * @returns Status response object
 */
export async function checkUserExportStatus(exportId: string): Promise<DataExportResponse> {
  const exportData = await getUserDataExportById(exportId);
  
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
        downloadUrl = getUserExportDownloadUrl(exportData.filePath);
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