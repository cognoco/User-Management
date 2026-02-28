/**
 * Supabase SSO Data Provider Implementation
 *
 * This class implements the SsoDataProvider interface using Supabase
 * as the underlying storage mechanism.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  SsoDomain,
  SsoProvider,
  SsoProviderPayload,
  SsoProviderQueryParams,
  SsoProviderListResult,
  SsoProviderResult,
  SsoProviderBatchResult,
} from '../../../core/sso/models';
import type { ISsoDataProvider } from '@/core/sso/ISsoDataProvider';


export class SupabaseSsoProvider implements ISsoDataProvider {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async listProviders(organizationId: string): Promise<SsoProvider[]> {
    const { data, error } = await this.supabase
      .from('sso_providers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map(this.mapRecordToProvider);
  }

  async upsertProvider(
    payload: SsoProviderPayload
  ): Promise<{ success: boolean; provider?: SsoProvider; error?: string }> {
    const { data, error } = await this.supabase
      .from('sso_providers')
      .upsert(
        {
          organization_id: payload.organizationId,
          provider_type: payload.providerType,
          provider_name: payload.providerName,
          config: payload.config,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,provider_type,provider_name' }
      )
      .select()
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to upsert SSO provider' };
    }

    return { success: true, provider: this.mapRecordToProvider(data) };
  }

  async createProvider(payload: SsoProviderPayload): Promise<SsoProviderResult> {
    const { data, error } = await this.supabase
      .from('sso_providers')
      .insert({
        organization_id: payload.organizationId,
        provider_type: payload.providerType,
        provider_name: payload.providerName,
        config: payload.config,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to create SSO provider' };
    }

    return { success: true, provider: this.mapRecordToProvider(data) };
  }

  async updateProvider(
    providerId: string,
    payload: Partial<SsoProviderPayload>
  ): Promise<SsoProviderResult> {
    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if (payload.providerType) update.provider_type = payload.providerType;
    if (payload.providerName) update.provider_name = payload.providerName;
    if (payload.config) update.config = payload.config;

    const { data, error } = await this.supabase
      .from('sso_providers')
      .update(update)
      .eq('id', providerId)
      .select()
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to update SSO provider' };
    }

    return { success: true, provider: this.mapRecordToProvider(data) };
  }

  async queryProviders(
    organizationId: string,
    query: SsoProviderQueryParams = {}
  ): Promise<SsoProviderListResult> {
    const page = query.page ?? 0;
    const limit = query.limit ?? 20;

    let req = this.supabase
      .from('sso_providers')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (query.providerType) req = req.eq('provider_type', query.providerType);
    if (typeof query.isActive === 'boolean') req = req.eq('is_active', query.isActive);

    if (query.sortBy) {
      const column = query.sortBy === 'providerName' ? 'provider_name' : 'created_at';
      req = req.order(column, { ascending: query.sortDirection !== 'desc' });
    } else {
      req = req.order('created_at', { ascending: false });
    }

    req = req.range(page * limit, page * limit + limit - 1);

    const { data, error, count } = await req;

    if (error) {
      throw new Error(error.message);
    }

    const providers = (data || []).map(this.mapRecordToProvider);
    const total = count ?? providers.length;
    const totalPages = Math.ceil(total / limit);

    return {
      providers,
      pagination: {
        page,
        pageSize: limit,
        totalItems: total,
        totalPages,
        hasNextPage: page * limit + providers.length < total,
        hasPreviousPage: page > 0,
      },
    };
  }

  async getProvider(
    organizationId: string,
    providerId: string
  ): Promise<SsoProvider | null> {
    const { data, error } = await this.supabase
      .from('sso_providers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', providerId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapRecordToProvider(data);
  }

  async setProviderActive(
    providerId: string,
    active: boolean
  ): Promise<SsoProviderResult> {
    const { data, error } = await this.supabase
      .from('sso_providers')
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq('id', providerId)
      .select()
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to update provider status' };
    }

    return { success: true, provider: this.mapRecordToProvider(data) };
  }

  async deleteProvider(providerId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('sso_providers')
      .delete()
      .eq('id', providerId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  async deleteProviders(providerIds: string[]): Promise<SsoProviderBatchResult> {
    const results: SsoProviderBatchResult['results'] = [];

    for (const id of providerIds) {
      const { error } = await this.supabase
        .from('sso_providers')
        .delete()
        .eq('id', id);

      results.push({ id, success: !error, error: error?.message });
    }

    return { success: results.every(r => r.success), results };
  }

  // ── Domain management ─────────────────────────────────────────

  async listDomains(organizationId: string): Promise<SsoDomain[]> {
    // Find provider for this org, then get its domains
    const { data: provider } = await this.supabase
      .from('sso_providers')
      .select('id')
      .eq('resource_id', organizationId)
      .maybeSingle();

    if (!provider) return [];

    const { data, error } = await this.supabase
      .from('sso_domains')
      .select('*')
      .eq('sso_provider_id', provider.id);

    if (error) throw new Error(error.message);
    return (data || []).map(this.mapRecordToDomain);
  }

  async addDomain(organizationId: string, domain: string): Promise<{ success: boolean; domain?: SsoDomain; error?: string }> {
    const { data: provider } = await this.supabase
      .from('sso_providers')
      .select('id')
      .eq('resource_id', organizationId)
      .maybeSingle();

    if (!provider) return { success: false, error: 'SSO provider not found for this org' };

    // Check for duplicate
    const { data: existing } = await this.supabase
      .from('sso_domains')
      .select('id')
      .eq('sso_provider_id', provider.id)
      .eq('domain', domain)
      .maybeSingle();

    if (existing) return { success: false, error: 'Domain already exists' };

    const { data, error } = await this.supabase
      .from('sso_domains')
      .insert({
        id: crypto.randomUUID(),
        domain,
        sso_provider_id: provider.id,
      })
      .select()
      .single();

    if (error || !data) return { success: false, error: error?.message || 'Failed to add domain' };
    return { success: true, domain: this.mapRecordToDomain(data) };
  }

  async removeDomain(organizationId: string, domain: string): Promise<{ success: boolean; error?: string }> {
    const { data: provider } = await this.supabase
      .from('sso_providers')
      .select('id')
      .eq('resource_id', organizationId)
      .maybeSingle();

    if (!provider) return { success: false, error: 'SSO provider not found' };

    const { data: existing } = await this.supabase
      .from('sso_domains')
      .select('id')
      .eq('sso_provider_id', provider.id)
      .eq('domain', domain)
      .maybeSingle();

    if (!existing) return { success: false, error: 'Domain not found' };

    const { error } = await this.supabase
      .from('sso_domains')
      .delete()
      .eq('id', existing.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  private mapRecordToDomain(record: any): SsoDomain {
    return {
      id: record.id,
      ssoproviderId: record.sso_provider_id,
      domain: record.domain,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private mapRecordToProvider(record: any): SsoProvider {
    return {
      id: record.id,
      organizationId: record.organization_id,
      providerType: record.provider_type,
      providerName: record.provider_name,
      config: record.config || {},
      isActive: record.is_active,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}
