/**
 * Test Service Container
 * 
 * This provides a complete mock service container for testing routes.
 * It eliminates the circular dependency issues by providing pre-configured mocks.
 */

import { vi } from 'vitest';

// Create mock services with all required methods
const createMockAuthService = () => ({
  login: vi.fn().mockResolvedValue({ user: { id: 'user-1' }, token: 'token' }),
  register: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
  logout: vi.fn().mockResolvedValue(undefined),
  verifyEmail: vi.fn().mockResolvedValue(true),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  resetPassword: vi.fn().mockResolvedValue(undefined),
  updatePassword: vi.fn().mockResolvedValue(undefined),
  deleteAccount: vi.fn().mockResolvedValue(undefined),
  refreshToken: vi.fn().mockResolvedValue({ token: 'new-token' }),
  setupTwoFactor: vi.fn().mockResolvedValue({ secret: 'secret', qrCode: 'qr' }),
  verifyTwoFactor: vi.fn().mockResolvedValue(true),
  disableTwoFactor: vi.fn().mockResolvedValue(undefined),
  generateBackupCodes: vi.fn().mockResolvedValue(['1234-5678']),
  verifyBackupCode: vi.fn().mockResolvedValue(true),
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
  validateSession: vi.fn().mockResolvedValue({ valid: true, user: { id: 'user-1' } }),
});

const createMockUserService = () => ({
  getProfile: vi.fn().mockResolvedValue({ id: 'user-1', name: 'Test User' }),
  updateProfile: vi.fn().mockResolvedValue({ id: 'user-1', name: 'Updated User' }),
  uploadAvatar: vi.fn().mockResolvedValue({ url: 'avatar-url' }),
  getAddresses: vi.fn().mockResolvedValue([]),
  addAddress: vi.fn().mockResolvedValue({ id: 'addr-1' }),
  updateAddress: vi.fn().mockResolvedValue({ id: 'addr-1' }),
  deleteAddress: vi.fn().mockResolvedValue(undefined),
  setDefaultAddress: vi.fn().mockResolvedValue(undefined),
});

const createMockPermissionService = () => ({
  checkPermission: vi.fn().mockResolvedValue(true),
  checkPermissions: vi.fn().mockResolvedValue({ 'READ': true, 'WRITE': true }),
  checkRole: vi.fn().mockResolvedValue(true),
  getUserPermissions: vi.fn().mockResolvedValue(['READ', 'WRITE']),
  getAllPermissions: vi.fn().mockResolvedValue([]),
  getPermissionById: vi.fn().mockResolvedValue({ id: 'perm-1', name: 'READ' }),
  getPermissionCategories: vi.fn().mockResolvedValue([]),
  validatePermissions: vi.fn().mockResolvedValue(true),
});

const createMockSubscriptionService = () => ({
  getCurrentSubscription: vi.fn().mockResolvedValue({ plan: 'pro', status: 'active' }),
  getAvailablePlans: vi.fn().mockResolvedValue([{ id: 'pro', name: 'Pro' }]),
  createCheckoutSession: vi.fn().mockResolvedValue({ sessionId: 'session-1', url: 'stripe-url' }),
  createBillingPortalSession: vi.fn().mockResolvedValue({ url: 'portal-url' }),
  cancelSubscription: vi.fn().mockResolvedValue(undefined),
  getSubscriptionStatus: vi.fn().mockResolvedValue({ active: true }),
});

const createMockTeamService = () => ({
  getTeamMembers: vi.fn().mockResolvedValue([]),
  inviteTeamMember: vi.fn().mockResolvedValue({ inviteId: 'invite-1' }),
  acceptInvite: vi.fn().mockResolvedValue(undefined),
  updateMemberRole: vi.fn().mockResolvedValue(undefined),
  removeMember: vi.fn().mockResolvedValue(undefined),
});

const createMockAdminService = () => ({
  getDashboardStats: vi.fn().mockResolvedValue({ users: 100, teams: 10 }),
  getUsers: vi.fn().mockResolvedValue({ users: [], total: 0 }),
  getUserById: vi.fn().mockResolvedValue({ id: 'user-1' }),
  searchUsers: vi.fn().mockResolvedValue([]),
  getSavedSearches: vi.fn().mockResolvedValue([]),
  createSavedSearch: vi.fn().mockResolvedValue({ id: 'search-1' }),
  updateSavedSearch: vi.fn().mockResolvedValue({ id: 'search-1' }),
  deleteSavedSearch: vi.fn().mockResolvedValue(undefined),
});

const createMockOAuthService = () => ({
  getAuthorizationUrl: vi.fn().mockResolvedValue({ url: 'oauth-url', state: 'state' }),
  handleCallback: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
  disconnectProvider: vi.fn().mockResolvedValue(undefined),
  linkProvider: vi.fn().mockResolvedValue(undefined),
  verifyProviderEmail: vi.fn().mockResolvedValue(true),
});

const createMockSsoService = () => ({
  getProviders: vi.fn().mockResolvedValue([]),
  upsertProvider: vi.fn().mockResolvedValue({ id: 'sso-1' }),
  deleteProvider: vi.fn().mockResolvedValue(undefined),
  initiateSso: vi.fn().mockResolvedValue({ url: 'sso-url' }),
  handleSsoCallback: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
});

/**
 * Create a complete test service container with all mocked services
 */
export function createTestServiceContainer() {
  return {
    auth: createMockAuthService(),
    user: createMockUserService(),
    permission: createMockPermissionService(),
    subscription: createMockSubscriptionService(),
    team: createMockTeamService(),
    admin: createMockAdminService(),
    oauth: createMockOAuthService(),
    sso: createMockSsoService(),
    // Add any other services as needed
  };
}

/**
 * Helper to get a specific mocked service for customization
 */
export function getMockService(container: any, serviceName: string) {
  return container[serviceName];
}

/**
 * Reset all mocks in the container
 */
export function resetTestServiceContainer(container: any) {
  Object.values(container).forEach((service: any) => {
    Object.values(service).forEach((method: any) => {
      if (typeof method === 'function' && method.mockReset) {
        method.mockReset();
      }
    });
  });
}