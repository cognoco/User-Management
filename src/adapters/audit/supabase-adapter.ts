import { createClient, SupabaseClient } from '@supabase/supabase-js';

import type { IAuditDataProvider } from '@/core/audit/IAuditDataProvider';
import {
  AuditLogEntry,
  AuditLogQuery,
  AuditLogCreatePayload,
  AuditLogUpdatePayload,
  AuditLogResult
} from '@/core/audit/models';

export class SupabaseAuditAdapter implements IAuditDataProvider {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  private mapDbLog(record: any): AuditLogEntry {
    return {
      id: record.id.toString(),
      createdAt: record.created_at,
      userId: record.user_id || undefined,
      action: record.action,
      status: record.status,
      ipAddress: record.ip_address || undefined,
      userAgent: record.user_agent || undefined,
      targetResourceType: record.target_resource_type || undefined,
      targetResourceId: record.target_resource_id || undefined,
      details: record.details || undefined,
    };
  }

  async createLog(entry: AuditLogCreatePayload): Promise<AuditLogResult> {
    try {
      const { data, error } = await this.supabase
        .from('user_actions_log')
        .insert({
          user_id: entry.userId,
          action: entry.action,
          status: entry.status,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          target_resource_type: entry.targetResourceType,
          target_resource_id: entry.targetResourceId,
          details: entry.details ?? {},
          created_at: entry.createdAt ?? new Date().toISOString()
        })
        .select('*')
        .single();

      if (error || !data) {
        return { success: false, error: error?.message || 'Failed to create log' };
      }

      return { success: true, log: this.mapDbLog(data) };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async getLog(id: string): Promise<AuditLogEntry | null> {
    const { data, error } = await this.supabase
      .from('user_actions_log')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return this.mapDbLog(data);
  }

  async getLogs(
    query: AuditLogQuery
  ): Promise<{ logs: AuditLogEntry[]; count: number }> {
    let q = this.supabase
      .from('user_actions_log')
      .select('*', { count: 'exact' });

    if (query.userId) q = q.eq('user_id', query.userId);
    if (query.startDate) q = q.gte('created_at', query.startDate);
    if (query.endDate) q = q.lte('created_at', query.endDate);
    if (query.action) q = q.eq('action', query.action);
    if (query.status) q = q.eq('status', query.status);
    if (query.resourceType) q = q.eq('target_resource_type', query.resourceType);
    if (query.resourceId) q = q.eq('target_resource_id', query.resourceId);
    if (query.ipAddress) q = q.ilike('ip_address', `%${query.ipAddress}%`);
    if (query.userAgent) q = q.ilike('user_agent', `%${query.userAgent}%`);
    if (query.search) {
      q = q.or(
        `action.ilike.%${query.search}%,details::text.ilike.%${query.search}%,error.ilike.%${query.search}%,target_resource_id.ilike.%${query.search}%,target_resource_type.ilike.%${query.search}%`
      );
    }

    const sortBy = query.sortBy || 'created_at';
    const ascending = query.sortOrder === 'asc';

    q = q.order(sortBy, { ascending }).range(
      (query.page - 1) * query.limit,
      query.page * query.limit - 1
    );

    const { data, error, count } = await q;
    if (error) {
      return { logs: [], count: 0 };
    }

    const logs = (data || []).map((r: any) => this.mapDbLog(r));
    return { logs, count: count ?? logs.length };
  }

  async updateLog(id: string, updates: AuditLogUpdatePayload): Promise<AuditLogResult> {
    try {
      const { data, error } = await this.supabase
        .from('user_actions_log')
        .update({
          user_id: updates.userId,
          action: updates.action,
          status: updates.status,
          ip_address: updates.ipAddress,
          user_agent: updates.userAgent,
          target_resource_type: updates.targetResourceType,
          target_resource_id: updates.targetResourceId,
          details: updates.details
        })
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (error || !data) {
        return { success: false, error: error?.message || 'Failed to update log' };
      }
      return { success: true, log: this.mapDbLog(data) };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async deleteLog(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.from('user_actions_log').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async exportLogs(query: AuditLogQuery): Promise<Blob> {
    const { logs } = await this.getLogs(query);
    
    // Import the export utility dynamically to avoid circular dependencies
    const { exportAuditLogs } = await import('@/utils/export/auditExport');
    
    return exportAuditLogs(logs, query.format);
  }

  // keep old method name for backward compatibility
  async getUserActionLogs(
    query: AuditLogQuery
  ): Promise<{ logs: AuditLogEntry[]; count: number }> {
    return this.getLogs(query);
  }
}
