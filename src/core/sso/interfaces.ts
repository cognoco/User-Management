/**
 * SSO Service Interface
 *
 * This file defines the core interfaces for the SSO domain.
 */

import { SsoDomain, SsoProvider, SsoProviderPayload } from './models';

/**
 * SSO service interface used by the API layer and hooks
 *
 * **Error handling:**
 * Methods should reject on unexpected provider errors. Business validation
 * issues should be returned in the resolved object when the method's return
 * type includes an `error` property.
 */
export interface SsoService {
  /**
   * Get all active SSO providers for an organization
   */
  getProviders(organizationId: string): Promise<SsoProvider[]>;

  /**
   * Create or update an SSO provider for an organization.
   *
   * @param payload - Provider configuration details
   * @returns Result object containing the created/updated provider on success or
   *          an error description. Implementations should only reject the
   *          promise for unexpected failures.
   */
  upsertProvider(
    payload: SsoProviderPayload
  ): Promise<{ success: boolean; provider?: SsoProvider; error?: string }>;

  /**
   * Retrieve a specific SSO provider by identifier.
   *
   * @param organizationId - Organization that owns the provider
   * @param providerId - Identifier of the provider to retrieve
   * @returns The provider or `null` if it does not exist.
   */
  getProvider(
    organizationId: string,
    providerId: string
  ): Promise<SsoProvider | null>;

  /**
   * Remove an SSO provider configuration.
   *
   * @param providerId - Identifier of the provider to delete
   * @returns Result object describing success or failure
   */
  deleteProvider(providerId: string): Promise<{ success: boolean; error?: string }>;

  // ── Domain management ─────────────────────────────────────────

  /** List SSO domains for an organization. */
  listDomains(organizationId: string): Promise<SsoDomain[]>;

  /** Add a domain to the organization's SSO provider. */
  addDomain(organizationId: string, domain: string): Promise<{ success: boolean; domain?: SsoDomain; error?: string }>;

  /** Remove a domain from the organization's SSO provider. */
  removeDomain(organizationId: string, domain: string): Promise<{ success: boolean; error?: string }>;
}
