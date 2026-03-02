import '@/types/database';

/**
 * Temporary compatibility shim — merges legacy flat privacy fields into the new `Profile` type.
 * This keeps older UI components & tests compiling while we gradually migrate them to
 * the nested `privacySettings` structure defined in `profileSchema`.
 *
 * ⚠️ Remove once all usages of the fields below are eliminated.
 */
declare module '@/types/database' {
  interface Profile {
    /** @deprecated legacy flat flag for public profile */
    isPublic?: boolean;
    /** @deprecated legacy flat flag for location visibility */
    showLocation?: boolean;
    /** @deprecated legacy flat flag for email visibility */
    showEmail?: boolean;

    /**
     * Legacy aggregate visibility object used by some UI forms.
     * Replaced by `privacySettings.profileVisibility`, etc.
     */
    visibility?: {
      profile: 'public' | 'private' | 'connections';
      location: 'public' | 'private' | 'connections';
      email: 'public' | 'private' | 'connections';
    };

    /** business-profile link used in old conversion flow */
    businessId?: string;

    /** upstream DB snake_case alias still referenced in a few spots */
    avatar_url?: string | null;

    /** timestamp fields referenced by invitation UI */
    sentAt?: string | Date;
    completedAt?: string | Date;
  }
}

export {}; 