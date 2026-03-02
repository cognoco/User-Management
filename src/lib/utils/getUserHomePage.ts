/**
 * Determines the homepage/dashboard route for a user based on preferences.
 * Falls back to /dashboard/overview if no preference is set.
 *
 * Accepts any user-like object with optional metadata.
 */
export function getUserHomePage(user: {
  metadata?: Record<string, any> | null;
  company?: { homepage?: string } | null;
  [key: string]: any;
}): string {
  // 1. Company-level homepage preference
  if (user.company && typeof user.company === 'object' && 'homepage' in user.company && user.company.homepage) {
    return user.company.homepage as string;
  }

  // 2. User-level homepage preference (metadata)
  if (user.metadata && typeof user.metadata === 'object' && user.metadata.homepage) {
    return user.metadata.homepage;
  }

  // 3. Fallback: default dashboard
  return '/dashboard/overview';
}

/**
 * Default dashboard tiles (can be customized per company/user in the future)
 */
export const DEFAULT_DASHBOARD_TILES = [
  { key: 'account', label: 'My Account', path: '/settings/account' },
  { key: 'favorites', label: 'Favorites', path: '/favorites' },
  { key: 'recent', label: 'Recent Activity', path: '/activity' },
  { key: 'settings', label: 'Settings', path: '/settings' },
];
