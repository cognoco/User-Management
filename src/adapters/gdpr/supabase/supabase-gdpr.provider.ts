/**
 * Supabase GDPR Provider Implementation
 *
 * Provides data persistence for GDPR operations such as data export and
 * deletion requests using Supabase tables.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IGdprDataProvider } from '@/core/gdpr/IGdprDataProvider';
import type {
  UserDataExport,
  AccountDeletionResult,
  DataExportQuery,
  DeletionRequest,
  DeletionRequestQuery,
} from '@/core/gdpr/models';
import type { PaginationMeta } from '@/lib/api/common/response-formatter';

export class SupabaseGdprProvider implements IGdprDataProvider {
  private supabase: SupabaseClient;

  constructor(private supabaseUrl: string, private supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /** @inheritdoc */
  async requestUserExport(userId: string): Promise<{ success: boolean; export?: UserDataExport; error?: string }> {
    const exportData = await this.generateUserExport(userId);
    if (!exportData) {
      return { success: false, error: 'User not found' };
    }

    const { data, error } = await this.supabase
      .from('user_data_exports')
      .insert({
        user_id: exportData.userId,
        filename: exportData.filename,
        data: exportData.data,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to store export' };
    }

    return { success: true, export: this.mapExportRecord(data) };
  }

  /** @inheritdoc */
  async generateUserExport(userId: string): Promise<UserDataExport | null> {
    const { data, error } = await this.supabase.auth.admin.getUserById(userId);
    if (error || !data?.user) {
      return null;
    }

    const user = data.user;
    const exportData = {
      userId: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
    } as Record<string, any>;

    const filename = `user_data_export_${user.id}_${Date.now()}.json`;
    return { userId: user.id, filename, data: exportData };
  }

  /** @inheritdoc */
  async getUserExport(exportId: string): Promise<UserDataExport | null> {
    const { data, error } = await this.supabase
      .from('user_data_exports')
      .select('*')
      .eq('id', exportId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapExportRecord(data);
  }

  /** @inheritdoc */
  async listUserExports(query: DataExportQuery): Promise<{ exports: UserDataExport[]; pagination: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let dbQuery = this.supabase.from('user_data_exports').select('*', { count: 'exact' });

    if (query.userId) {
      dbQuery = dbQuery.eq('user_id', query.userId);
    }

    const sortField = query.sortBy ?? 'created_at';
    const ascending = (query.sortOrder ?? 'asc') === 'asc';
    dbQuery = dbQuery.order(sortField, { ascending }).range(from, to);

    const { data, error, count } = await dbQuery;

    if (error || !data) {
      return {
        exports: [],
        pagination: {
          page,
          pageSize: limit,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    const total = count ?? 0;
    return {
      exports: data.map(this.mapExportRecord),
      pagination: {
        page,
        pageSize: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: from + data.length < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  /** @inheritdoc */
  async deleteUserData(userId: string): Promise<AccountDeletionResult> {
    try {
      console.log(`Mock deleting user data for ${userId}`);
      return { success: true, message: 'Account deletion initiated (mock).' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Deletion failed' };
    }
  }

  /** @inheritdoc */
  async requestAccountDeletion(
    userId: string,
    scheduledDeletionAt: string,
  ): Promise<{ success: boolean; request?: DeletionRequest; error?: string }> {
    const { data, error } = await this.supabase
      .from('deletion_requests')
      .insert({
        user_id: userId,
        status: 'pending',
        requested_at: new Date().toISOString(),
        scheduled_deletion_at: scheduledDeletionAt,
      })
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to create deletion request' };
    }

    return { success: true, request: this.mapDeletionRecord(data) };
  }

  /** @inheritdoc */
  async getDeletionRequest(userId: string): Promise<DeletionRequest | null> {
    const { data, error } = await this.supabase
      .from('deletion_requests')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapDeletionRecord(data);
  }

  /** @inheritdoc */
  async listDeletionRequests(query: DeletionRequestQuery): Promise<{ requests: DeletionRequest[]; pagination: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let dbQuery = this.supabase.from('deletion_requests').select('*', { count: 'exact' });

    if (query.userId) {
      dbQuery = dbQuery.eq('user_id', query.userId);
    }

    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }

    const sortField = query.sortBy ?? 'requested_at';
    const ascending = (query.sortOrder ?? 'asc') === 'asc';
    dbQuery = dbQuery.order(sortField, { ascending }).range(from, to);

    const { data, error, count } = await dbQuery;

    if (error || !data) {
      return {
        requests: [],
        pagination: {
          page,
          pageSize: limit,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    const total = count ?? 0;
    return {
      requests: data.map(this.mapDeletionRecord),
      pagination: {
        page,
        pageSize: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: from + data.length < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  /** @inheritdoc */
  async cancelDeletionRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('deletion_requests')
      .update({ status: 'failed', completed_at: new Date().toISOString(), message: 'Cancelled' })
      .eq('id', requestId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  private mapExportRecord(record: any): UserDataExport {
    return {
      userId: record.user_id,
      filename: record.filename,
      data: record.data || {},
    };
  }

  private mapDeletionRecord(record: any): DeletionRequest {
    return {
      id: record.id,
      userId: record.user_id,
      status: record.status,
      requestedAt: record.requested_at,
      completedAt: record.completed_at ?? undefined,
      scheduledDeletionAt: record.scheduled_deletion_at ?? undefined,
      message: record.message ?? undefined,
    };
  }
}

export default SupabaseGdprProvider;
