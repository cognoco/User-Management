/**
 * SSO Data Provider Interface
 *
 * Defines the contract for persistence operations related to Single Sign-On (SSO).
 * This abstraction allows the service layer to remain database-agnostic.
 */
import type {
  SsoDomain,
  SsoProvider,
  SsoProviderPayload,
  SsoProviderQueryParams,
  SsoProviderListResult,
  SsoProviderResult,
  SsoProviderBatchResult,
} from './models';

export interface ISsoDataProvider {
  /**
   * Persist a new SSO provider configuration.
   */
  createProvider(payload: SsoProviderPayload): Promise<SsoProviderResult>;

  /**
   * Update an existing provider configuration.
   */
  updateProvider(
    providerId: string,
    payload: Partial<SsoProviderPayload>
  ): Promise<SsoProviderResult>;

  /**
   * Create or update an SSO provider configuration.
   * This is a convenience method for callers that do not
   * need to differentiate between creation and update.
   */
  upsertProvider(
    payload: SsoProviderPayload
  ): Promise<{ success: boolean; provider?: SsoProvider; error?: string }>;

  /**
   * Retrieve providers for an organization with optional filtering.
   */
  listProviders(organizationId: string): Promise<SsoProvider[]>;

  /**
   * Retrieve providers for an organization with pagination and filtering.
   *
   * @example
   * ```ts
   * const result = await provider.queryProviders(orgId, {
   *   page: 1,
   *   limit: 10,
   *   sortBy: 'providerName',
   *   sortDirection: 'asc',
   * });
   * ```
   */
  queryProviders(
    organizationId: string,
    query?: SsoProviderQueryParams
  ): Promise<SsoProviderListResult>;

  /**
   * Get a specific SSO provider by ID.
   */
  getProvider(
    organizationId: string,
    providerId: string
  ): Promise<SsoProvider | null>;

  /**
   * Activate or deactivate a provider.
   */
  setProviderActive(
    providerId: string,
    active: boolean
  ): Promise<SsoProviderResult>;

  /**
   * Delete an SSO provider by ID.
   */
  deleteProvider(
    providerId: string
  ): Promise<{ success: boolean; error?: string }>;

  /**
   * Delete multiple providers in a single operation.
   */
  deleteProviders(providerIds: string[]): Promise<SsoProviderBatchResult>;

  // ── SSO Domain management ─────────────────────────────────────────

  /**
   * List domains linked to an SSO provider for a given organization.
   */
  listDomains(organizationId: string): Promise<SsoDomain[]>;

  /**
   * Add a domain to an SSO provider.
   */
  addDomain(organizationId: string, domain: string): Promise<{ success: boolean; domain?: SsoDomain; error?: string }>;

  /**
   * Remove a domain from an SSO provider.
   */
  removeDomain(organizationId: string, domain: string): Promise<{ success: boolean; error?: string }>;
}

/** Convenience alias. */
export type SsoDataProvider = ISsoDataProvider;
