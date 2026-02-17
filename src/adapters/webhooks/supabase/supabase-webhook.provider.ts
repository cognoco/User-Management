import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import type { IWebhookDataProvider } from '@/core/webhooks/IWebhookDataProvider';
import type {
  Webhook,
  WebhookCreatePayload,
  WebhookUpdatePayload,
  WebhookDelivery,
  WebhookListQuery,
  WebhookDeliveryQuery
} from '@/core/webhooks/models';
import type { PaginationMeta } from '@/lib/api/common/response-formatter';

/**
 * Supabase implementation of the {@link IWebhookDataProvider} interface.
 *
 * Provides CRUD operations for webhook records and delivery logs using
 * Supabase as the persistence layer.
 */
export class SupabaseWebhookProvider implements IWebhookDataProvider {
  private supabase: SupabaseClient;

  /**
   * Create a new provider instance.
   *
   * @param supabaseUrl   Supabase project URL
   * @param supabaseKey   Supabase service role key
   */
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /** @inheritdoc */
  async listWebhooks(userId: string): Promise<Webhook[]> {
    const { data, error } = await this.supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', userId);

    if (error || !data) return [];
    return data.map(r => this.mapRecord(r));
  }

  /** @inheritdoc */
  async searchWebhooks(
    userId: string,
    query: WebhookListQuery
  ): Promise<{ webhooks: Webhook[]; pagination: PaginationMeta }> {
    let req = this.supabase
      .from('webhooks')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (typeof query.isActive === 'boolean') req = req.eq('is_active', query.isActive);
    if (query.event) req = req.contains('events', [query.event]);
    if (query.sortBy)
      req = req.order(query.sortBy as string, { ascending: query.sortOrder !== 'desc' });

    if (query.limit && query.page) {
      const from = (query.page - 1) * query.limit;
      const to = from + query.limit - 1;
      req = req.range(from, to);
    } else if (query.limit) {
      req = req.limit(query.limit);
    }

    const { data, count } = await req;
    const items = data ? data.map(r => this.mapRecord(r)) : [];
    return {
      webhooks: items,
      pagination: {
        page: query.page ?? 1,
        pageSize: query.limit ?? items.length,
        totalItems: count ?? items.length,
        totalPages: query.limit ? Math.ceil((count ?? items.length) / query.limit) : 1,
        hasNextPage: query.limit ? (query.page ?? 1) * query.limit < (count ?? items.length) : false,
        hasPreviousPage: query.limit ? (query.page ?? 1) > 1 : false
      }
    };
  }

  /** @inheritdoc */
  async getWebhook(userId: string, id: string): Promise<Webhook | null> {
    const { data, error } = await this.supabase
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRecord(data);
  }

  /** @inheritdoc */
  async createWebhook(
    userId: string,
    payload: WebhookCreatePayload
  ): Promise<{ success: boolean; webhook?: Webhook; error?: string }> {
    const secret = crypto.randomBytes(32).toString('hex');

    const { data, error } = await this.supabase
      .from('webhooks')
      .insert({
        user_id: userId,
        name: payload.name,
        url: payload.url,
        events: payload.events,
        secret,
        is_active: payload.isActive ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to create webhook' };
    }
    return { success: true, webhook: this.mapRecord(data) };
  }

  /** @inheritdoc */
  async updateWebhook(
    userId: string,
    id: string,
    payload: WebhookUpdatePayload
  ): Promise<{ success: boolean; webhook?: Webhook; error?: string }> {
    const { data, error } = await this.supabase
      .from('webhooks')
      .update({
        name: payload.name,
        url: payload.url,
        events: payload.events,
        is_active: payload.isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();

    if (error || !data) return { success: false, error: error?.message };
    return { success: true, webhook: this.mapRecord(data) };
  }

  /** @inheritdoc */
  async deleteWebhook(
    userId: string,
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('webhooks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  /** @inheritdoc */
  async listDeliveries(
    userId: string,
    webhookId: string,
    query: number | WebhookDeliveryQuery = 10
  ): Promise<{ deliveries: WebhookDelivery[]; pagination?: PaginationMeta }> {
    const limit = typeof query === 'number' ? query : query.limit ?? 10;
    const { data } = await this.supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhookId)
      .eq('user_id', userId)
      .order('created_at', {
        ascending: typeof query === 'object' ? query.sortOrder === 'asc' : false
      })
      .limit(limit);

    const deliveries = (data || []) as WebhookDelivery[];
    return {
      deliveries,
      pagination:
        typeof query === 'object'
          ? {
              page: query.page ?? 1,
              pageSize: limit,
              totalItems: deliveries.length,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false
            }
          : undefined
    };
  }

  /** @inheritdoc */
  async recordDelivery(delivery: WebhookDelivery): Promise<void> {
    await this.supabase.from('webhook_deliveries').insert({
      id: delivery.id,
      webhook_id: delivery.webhookId,
      event_type: delivery.eventType,
      payload: delivery.payload,
      status_code: delivery.statusCode,
      response: delivery.response,
      error: delivery.error,
      created_at: delivery.createdAt
    });
  }

  /** Map database record to domain model */
  private mapRecord(record: any): Webhook {
    return {
      id: record.id,
      userId: record.user_id,
      url: record.url,
      events: record.events,
      secret: record.secret,
      name: record.name ?? '',
      isActive: record.is_active,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }
}

export default SupabaseWebhookProvider;
