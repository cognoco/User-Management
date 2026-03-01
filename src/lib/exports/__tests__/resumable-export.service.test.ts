import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase, resetSupabaseMock } from '@/tests/mocks/supabase';
import * as exportService from '../export.service';
import { processUserExportResumable } from '../resumable-export.service';
import { ExportFormat, ExportStatus, DataExportStorageBucket } from '../types';
import { DataExportError } from '@/core/common/errors';
import { EXPORT_ERROR } from '@/core/common/error-codes';

describe('processUserExportResumable', () => {
  beforeEach(() => {
    resetSupabaseMock();
    vi.restoreAllMocks();
  });

  it('completes a user export', async () => {
    vi.spyOn(exportService, 'getUserDataExportById').mockResolvedValue({
      id: 'exp1',
      userId: 'u1',
      format: ExportFormat.JSON,
      status: ExportStatus.PENDING,
      isLargeDataset: false,
    } as any);
    vi.spyOn(exportService, 'getUserExportData').mockResolvedValue({ profile: {}, preferences: {}, activityLogs: [] });

    await processUserExportResumable('exp1', 'u1');

    const upload = (supabase.storage.from as any).mock.results[0].value.upload;
    expect(upload).toHaveBeenCalled();
    const remove = (supabase.storage.from as any).mock.results[0].value.remove;
    expect(remove).not.toHaveBeenCalled();

    const update = (supabase.from as any).mock.results[0].value.update;
    const finalCall = update.mock.calls.pop()[0];
    expect(finalCall.status).toBe(ExportStatus.COMPLETED);
    expect(finalCall.progress).toBe(100);
  });

  it('cleans up when upload fails', async () => {
    vi.spyOn(exportService, 'getUserDataExportById').mockResolvedValue({
      id: 'exp2',
      userId: 'u1',
      format: ExportFormat.JSON,
      status: ExportStatus.PENDING,
      isLargeDataset: false,
    } as any);
    vi.spyOn(exportService, 'getUserExportData').mockResolvedValue({ profile: {}, preferences: {}, activityLogs: [] });

    // Force upload failure
    const storage = (supabase.storage.from as any).mock.results[0].value;
    storage.upload.mockResolvedValueOnce({ data: null, error: new Error('fail') });

    await expect(processUserExportResumable('exp2', 'u1')).rejects.toBeInstanceOf(DataExportError);

    const remove = storage.remove;
    expect(remove).toHaveBeenCalled();
    const err = await processUserExportResumable('exp2', 'u1').catch(e => e);
    expect(err.code).toBe(EXPORT_ERROR.EXPORT_001);
  });
});
