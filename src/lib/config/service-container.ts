/**
 * Service Container - Legacy Support
 * 
 * This provides legacy support for the getServiceContainer pattern
 * while transitioning to the new withValidatedServices pattern.
 * 
 * DEPRECATED: New routes should use withValidatedServices instead
 */

import type { ServiceContainer } from '@/core/config/interfaces';
import { ServiceLocator } from './service-locator';

/**
 * Get service container from service locator (legacy support)
 * @deprecated Use withValidatedServices instead
 */
export function getServiceContainer(overrides?: Partial<ServiceContainer>): ServiceContainer {
  const locator = ServiceLocator.getInstance();
  
  // Create container from service locator
  const container: Partial<ServiceContainer> = {};
  
  // Map common services
  const serviceMap = {
    'auth': 'AuthService',
    'user': 'UserService', 
    'permission': 'PermissionService',
    'team': 'TeamService',
    'sso': 'SsoService',
    'gdpr': 'GdprService',
    'twoFactor': 'TwoFactorService',
    'subscription': 'SubscriptionService',
    'apiKey': 'ApiKeyService',
    'notification': 'NotificationService',
    'webhook': 'WebhookService',
    'session': 'SessionService',
    'organization': 'OrganizationService',
    'csrf': 'CsrfService',
    'consent': 'ConsentService',
    'audit': 'AuditService',
    'admin': 'AdminService',
    'role': 'RoleService',
    'address': 'CompanyAddressService',
    'oauth': 'OAuthService',
    'companyNotification': 'CompanyNotificationService',
    'resourceRelationship': 'ResourceRelationshipService',
  } as const;
  
  // Get services from locator if available
  for (const [containerKey, locatorKey] of Object.entries(serviceMap)) {
    if (locator.has(locatorKey)) {
      container[containerKey as keyof ServiceContainer] = locator.get(locatorKey);
    }
  }
  
  // Apply any overrides
  if (overrides) {
    Object.assign(container, overrides);
  }
  
  return container as ServiceContainer;
}

/**
 * Configure services in the service locator
 * This is used during app initialization
 */
export function configureServices(services: ServiceContainer): void {
  const locator = ServiceLocator.getInstance();
  
  // Register services in the locator
  if (services.auth) locator.register('AuthService', services.auth);
  if (services.user) locator.register('UserService', services.user);
  if (services.permission) locator.register('PermissionService', services.permission);
  if (services.team) locator.register('TeamService', services.team);
  if (services.sso) locator.register('SsoService', services.sso);
  if (services.gdpr) locator.register('GdprService', services.gdpr);
  if (services.twoFactor) locator.register('TwoFactorService', services.twoFactor);
  if (services.subscription) locator.register('SubscriptionService', services.subscription);
  if (services.apiKey) locator.register('ApiKeyService', services.apiKey);
  if (services.notification) locator.register('NotificationService', services.notification);
  if (services.webhook) locator.register('WebhookService', services.webhook);
  if (services.session) locator.register('SessionService', services.session);
  if (services.organization) locator.register('OrganizationService', services.organization);
  if (services.csrf) locator.register('CsrfService', services.csrf);
  if (services.consent) locator.register('ConsentService', services.consent);
  if (services.audit) locator.register('AuditService', services.audit);
  if (services.admin) locator.register('AdminService', services.admin);
  if (services.role) locator.register('RoleService', services.role);
  if (services.address) locator.register('CompanyAddressService', services.address);
  if (services.oauth) locator.register('OAuthService', services.oauth);
  if (services.companyNotification) locator.register('CompanyNotificationService', services.companyNotification);
  if (services.resourceRelationship) locator.register('ResourceRelationshipService', services.resourceRelationship);
}

/**
 * Reset service container (used in tests)
 */
export function resetServiceContainer(): void {
  ServiceLocator.getInstance().clear();
}