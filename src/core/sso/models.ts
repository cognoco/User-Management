/**
 * SSO Domain Models
 *
 * This file defines the core entity models for the SSO domain.
 * These models represent SSO providers and related payloads.
 */

import { z } from 'zod';
import type { PaginationMeta } from '@/lib/api/common/response-formatter';
import type { DataProviderError } from '../common/errors';

/**
 * Supported SSO provider types
 */
export type SsoProviderType = 'saml' | 'oidc';

/**
 * SSO provider entity
 */
export interface SsoProvider {
  /** Unique identifier */
  id: string;
  /** Organization the provider belongs to */
  organizationId: string;
  /** Provider type (e.g. saml or oidc) */
  providerType: SsoProviderType;
  /** Name of the provider */
  providerName: string;
  /** Provider configuration stored as JSON */
  config: Record<string, any>;
  /** Whether the provider is active */
  isActive: boolean;
  /** Creation timestamp */
  createdAt?: string;
  /** Update timestamp */
  updatedAt?: string;
}

/**
 * Payload for creating/updating an SSO provider
 */
export interface SsoProviderPayload {
  organizationId: string;
  providerType: SsoProviderType;
  providerName: string;
  config: Record<string, any>;
}

// Validation schema used by API routes
export const ssoProviderSchema = z.object({
  organizationId: z.string().uuid(),
  providerType: z.enum(['saml', 'oidc']),
  providerName: z.string().min(1),
  config: z.record(z.any()),
});

export type SsoProviderData = z.infer<typeof ssoProviderSchema>;

/**
 * Query parameters for listing SSO providers.
 */
export interface SsoProviderQueryParams {
  providerType?: SsoProviderType;
  isActive?: boolean;
  sortBy?: 'providerName' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Paginated list result for SSO providers.
 */
export interface SsoProviderListResult {
  providers: SsoProvider[];
  pagination: PaginationMeta;
}

/**
 * Result of an operation that returns a single provider.
 */
export interface SsoProviderResult {
  success: boolean;
  provider?: SsoProvider;
  /** Optional short error message */
  error?: string;
  /** Detailed provider error */
  details?: DataProviderError;
}

/**
 * Result of deleting one or more providers.
 */
export interface SsoProviderDeleteResult {
  success: boolean;
  error?: string;
  details?: DataProviderError;
}

/**
 * SSO domain entity — represents a verified/pending email domain linked to an SSO provider.
 */
export interface SsoDomain {
  id: string;
  ssoproviderId: string;
  domain: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Batch delete result for providers.
 */
export interface SsoProviderBatchResult {
  success: boolean;
  results: {
    id: string;
    success: boolean;
    error?: string;
    details?: DataProviderError;
  }[];
}
