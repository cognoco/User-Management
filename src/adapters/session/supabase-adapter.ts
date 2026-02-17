/**
 * Supabase Session Provider Implementation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  SessionInfo,
  SessionCreatePayload,
  SessionUpdatePayload,
  SessionQueryParams,
  SessionListResult,
  SessionOperationResult,
  SessionDeletionResult,
  SessionBatchResult,
} from '@/core/session/models';
import type { ISessionDataProvider } from '@/core/session/ISessionDataProvider';
export class SupabaseSessionProvider implements ISessionDataProvider {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async listUserSessions(userId: string): Promise<SessionInfo[]> {
    const { data, error } = await (this.supabase.auth.admin as any).listUserSessions(userId);
    if (error) {
      throw new Error(error.message);
    }
    return (data || []).map((session: any) => ({
      id: session.id,
      createdAt: session.created_at,
      lastActiveAt: session.user_metadata?.last_activity,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      // Preserve original metadata for policy checks
      user_metadata: session.user_metadata,
      created_at: session.created_at,
    })) as any;
  }

  // Parameters are unused as this provider does not support creating sessions
  async createSession(
    _userId: string,
    _payload: SessionCreatePayload
  ): Promise<SessionOperationResult> {
    return { success: false, error: 'createSession not supported' };
  }

  async getSession(userId: string, sessionId: string): Promise<SessionInfo | null> {
    const sessions = await this.listUserSessions(userId);
    return sessions.find(s => s.id === sessionId) || null;
  }

  // Parameters are unused as this provider does not support updating sessions
  async updateSession(
    _userId: string,
    _sessionId: string,
    _update: SessionUpdatePayload
  ): Promise<SessionOperationResult> {
    return { success: false, error: 'updateSession not supported' };
  }

  async deleteUserSession(userId: string, sessionId: string): Promise<SessionDeletionResult> {
    const { error } = await (this.supabase.auth.admin as any).deleteUserSession(userId, sessionId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, count: 1 };
  }

  async queryUserSessions(
    userId: string,
    query: SessionQueryParams = {}
  ): Promise<SessionListResult> {
    const all = await this.listUserSessions(userId);
    const page = query.page ?? 0;
    const limit = query.limit ?? all.length;
    const start = page * limit;
    const end = start + limit;
    let items = all;
    if (query.ipAddress) items = items.filter(s => s.ipAddress === query.ipAddress);
    if (query.sortBy) {
      const dir = query.sortDirection === 'asc' ? 1 : -1;
      items = items.sort((a: any, b: any) => (a[query.sortBy!] > b[query.sortBy!] ? dir : -dir));
    }
    const paged = items.slice(start, end);
    return {
      sessions: paged,
      pagination: {
        page,
        pageSize: limit,
        totalItems: items.length,
        totalPages: Math.ceil(items.length / limit),
        hasNextPage: end < items.length,
        hasPreviousPage: page > 0,
      },
    };
  }

  async deleteUserSessions(userId: string, sessionIds: string[]): Promise<SessionBatchResult> {
    const results: SessionBatchResult['results'] = [];
    for (const id of sessionIds) {
      const res = await this.deleteUserSession(userId, id);
      results.push({ sessionId: id, success: res.success, error: res.error });
    }
    return { success: results.every(r => r.success), results };
  }

  async deleteAllUserSessions(userId: string): Promise<SessionDeletionResult> {
    const { data, error } = await this.supabase.rpc('terminate_user_sessions', { user_id: userId });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, count: data?.count ?? 0 };
  }
}
