import { createHash } from 'crypto';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import {
  ExportFormat,
  ExportStatus,
  DataExportStorageBucket,
  UserExportData,
  CompanyExportData,
} from './types';
import {
  getUserExportData,
  getUserDataExportById,
} from './export.service';

// Stubs for company export functions (not yet implemented in export.service)
async function getCompanyExportData(companyId: string): Promise<CompanyExportData | null> {
  return null;
}

async function getCompanyDataExportById(exportId: string): Promise<any | null> {
  return null;
}
import { DataExportError } from '@/core/common/errors';
import { EXPORT_ERROR } from '@/core/common/error-codes';

const LARGE_THRESHOLD = 5 * 1024 * 1024; // 5MB

function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(out, flattenObject(obj[key], newKey));
      } else if (Array.isArray(obj[key])) {
        out[newKey] = JSON.stringify(obj[key]);
      } else {
        out[newKey] = obj[key];
      }
    }
  }
  return out;
}

function flattenUserData(data: UserExportData): Array<Record<string, any>> {
  const result: Array<Record<string, any>> = [];
  if (data.profile) {
    result.push({ record_type: 'profile', ...flattenObject(data.profile) });
  }
  if (data.preferences) {
    result.push({ record_type: 'preferences', ...flattenObject(data.preferences) });
  }
  if (data.activityLogs) {
    data.activityLogs.forEach((log, i) => {
      result.push({ record_type: 'activity_log', log_index: i, ...flattenObject(log) });
    });
  }
  return result;
}

function flattenCompanyData(data: CompanyExportData): Array<Record<string, any>> {
  const result: Array<Record<string, any>> = [];
  if (data.companyProfile) {
    result.push({ record_type: 'company_profile', ...flattenObject(data.companyProfile) });
  }
  if (data.companyMembers) {
    data.companyMembers.forEach((m, i) => {
      result.push({ record_type: 'company_member', member_index: i, ...flattenObject(m) });
    });
  }
  if (data.companyRoles) {
    data.companyRoles.forEach((r, i) => {
      result.push({ record_type: 'company_role', role_index: i, ...flattenObject(r) });
    });
  }
  if (data.activityLogs) {
    data.activityLogs.forEach((log, i) => {
      result.push({ record_type: 'activity_log', log_index: i, ...flattenObject(log) });
    });
  }
  return result;
}

async function updateExport(table: string, id: string, fields: Record<string, any>) {
  await supabase.from(table).update(fields).eq('id', id);
}

export async function processUserExportResumable(exportId: string, userId: string): Promise<void> {
  let progress = 0;
  let filePath: string | undefined;
  try {
    const record = await getUserDataExportById(exportId);
    if (!record) {
      throw new DataExportError(EXPORT_ERROR.EXPORT_003, 'Export not found');
    }
    await updateExport('user_data_exports', exportId, {
      status: ExportStatus.PROCESSING,
      progress,
      error_message: null,
    });

    const data = await getUserExportData(userId);
    progress = 25;
    await updateExport('user_data_exports', exportId, { progress });

    let fileContent = JSON.stringify(data);
    let fileExtension = '.json';
    let contentType = 'application/json';
    if (record.format === ExportFormat.CSV) {
      fileContent = Papa.unparse(flattenUserData(data));
      fileExtension = '.csv';
      contentType = 'text/csv';
    }
    progress = 50;
    await updateExport('user_data_exports', exportId, { progress });

    filePath = `${userId}/user_export_${new Date().toISOString().replace(/[:.]/g, '-')}${fileExtension}`;
    const { error: uploadError } = await supabase.storage
      .from(DataExportStorageBucket.USER_EXPORTS)
      .upload(filePath, fileContent, { contentType, upsert: true });
    if (uploadError) throw uploadError;

    progress = 75;
    await updateExport('user_data_exports', exportId, { progress });

    const { data: dl, error: dlError } = await supabase.storage
      .from(DataExportStorageBucket.USER_EXPORTS)
      .download(filePath);
    if (dlError) throw dlError;
    const dlBuffer = await dl.arrayBuffer();
    const checksum = createHash('sha256').update(fileContent).digest('hex');
    const verify = createHash('sha256').update(Buffer.from(dlBuffer)).digest('hex');
    if (checksum !== verify) {
      throw new DataExportError(EXPORT_ERROR.EXPORT_002, 'Checksum mismatch');
    }

    progress = 90;
    await updateExport('user_data_exports', exportId, { progress });

    await updateExport('user_data_exports', exportId, {
      status: ExportStatus.COMPLETED,
      file_path: filePath,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_size_bytes: fileContent.length,
      is_large_dataset: fileContent.length > LARGE_THRESHOLD,
      checksum,
      progress: 100,
    });
  } catch (err: any) {
    await updateExport('user_data_exports', exportId, {
      status: ExportStatus.FAILED,
      error_message: err?.message || 'Unknown error',
      updated_at: new Date().toISOString(),
      progress,
    });
    if (filePath) {
      await supabase.storage
        .from(DataExportStorageBucket.USER_EXPORTS)
        .remove([filePath]);
    }
    if (err instanceof DataExportError) throw err;
    throw new DataExportError(EXPORT_ERROR.EXPORT_001, err?.message || 'Export failed');
  }
}

export async function resumeUserExport(exportId: string, userId: string) {
  const record = await getUserDataExportById(exportId);
  if (!record) {
    throw new DataExportError(EXPORT_ERROR.EXPORT_003, 'Export not found');
  }
  if (record.status === ExportStatus.COMPLETED) return;
  await processUserExportResumable(exportId, userId);
}

export async function processCompanyExportResumable(exportId: string, companyId: string, userId: string): Promise<void> {
  let progress = 0;
  let filePath: string | undefined;
  try {
    const record = await getCompanyDataExportById(exportId);
    if (!record) {
      throw new DataExportError(EXPORT_ERROR.EXPORT_003, 'Export not found');
    }
    await updateExport('company_data_exports', exportId, {
      status: ExportStatus.PROCESSING,
      progress,
      error_message: null,
    });

    const data = await getCompanyExportData(companyId);
    if (!data) throw new DataExportError(EXPORT_ERROR.EXPORT_003, 'Company data not found');
    progress = 25;
    await updateExport('company_data_exports', exportId, { progress });

    let fileContent = JSON.stringify(data);
    let fileExtension = '.json';
    let contentType = 'application/json';
    if (record.format === ExportFormat.CSV) {
      fileContent = Papa.unparse(flattenCompanyData(data));
      fileExtension = '.csv';
      contentType = 'text/csv';
    }
    progress = 50;
    await updateExport('company_data_exports', exportId, { progress });

    filePath = `${companyId}/company_export_${new Date().toISOString().replace(/[:.]/g, '-')}${fileExtension}`;
    const { error: uploadError } = await supabase.storage
      .from(DataExportStorageBucket.COMPANY_EXPORTS)
      .upload(filePath, fileContent, { contentType, upsert: true });
    if (uploadError) throw uploadError;

    progress = 75;
    await updateExport('company_data_exports', exportId, { progress });

    const { data: dl, error: dlError } = await supabase.storage
      .from(DataExportStorageBucket.COMPANY_EXPORTS)
      .download(filePath);
    if (dlError) throw dlError;
    const dlBuffer = await dl.arrayBuffer();
    const checksum = createHash('sha256').update(fileContent).digest('hex');
    const verify = createHash('sha256').update(Buffer.from(dlBuffer)).digest('hex');
    if (checksum !== verify) {
      throw new DataExportError(EXPORT_ERROR.EXPORT_002, 'Checksum mismatch');
    }

    progress = 90;
    await updateExport('company_data_exports', exportId, { progress });

    await updateExport('company_data_exports', exportId, {
      status: ExportStatus.COMPLETED,
      file_path: filePath,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_size_bytes: fileContent.length,
      is_large_dataset: fileContent.length > LARGE_THRESHOLD,
      checksum,
      progress: 100,
    });
  } catch (err: any) {
    await updateExport('company_data_exports', exportId, {
      status: ExportStatus.FAILED,
      error_message: err?.message || 'Unknown error',
      updated_at: new Date().toISOString(),
      progress,
    });
    if (filePath) {
      await supabase.storage
        .from(DataExportStorageBucket.COMPANY_EXPORTS)
        .remove([filePath]);
    }
    if (err instanceof DataExportError) throw err;
    throw new DataExportError(EXPORT_ERROR.EXPORT_001, err?.message || 'Export failed');
  }
}

export async function resumeCompanyExport(exportId: string, companyId: string, userId: string) {
  const record = await getCompanyDataExportById(exportId);
  if (!record) {
    throw new DataExportError(EXPORT_ERROR.EXPORT_003, 'Export not found');
  }
  if (record.status === ExportStatus.COMPLETED) return;
  await processCompanyExportResumable(exportId, companyId, userId);
}
