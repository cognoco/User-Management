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

    // Make core base fields optional so test mocks don't need full DB data
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    userId?: string;
    userType?: 'private' | 'corporate';
    avatarUrl?: string | null;
    bio?: string | null;
    location?: string | null;
    website?: string | null;
    phoneNumber?: string | null;
    privacySettings?: {
      showEmail?: boolean;
      showPhone?: boolean;
      showLocation?: boolean;
      profileVisibility?: 'public' | 'private' | 'contacts';
    };
    companyName?: string | null;
    companyLogoUrl?: string | null;
    companySize?: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+' | null;
    industry?: string | null;
    companyWebsite?: string | null;
    position?: string | null;
    department?: string | null;
    vatId?: string | null;
    address?: {
      street_line1: string;
      street_line2?: string | null;
      city: string;
      state?: string | null;
      postal_code: string;
      country: string;
      validated?: boolean | null;
    } | null;

    /** timestamp fields referenced by invitation UI */
    sentAt?: string | Date;
    completedAt?: string | Date;
  }
}

export {}; 