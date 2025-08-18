import type { ProfileService } from '@/core/profile/interfaces';
import type { Profile } from '@/types/database';
import { z } from 'zod';

// Privacy control types
export interface PrivacySettings {
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  showBirthDate: boolean;
  showCompanyInfo: boolean;
  profileVisibility: 'public' | 'private' | 'contacts' | 'organization';
  allowSearch: boolean;
  allowMessaging: boolean;
  dataExportEnabled: boolean;
}

export interface ProfileFieldVisibility {
  field: string;
  visible: boolean;
  visibleTo: 'public' | 'contacts' | 'organization' | 'private';
}

export interface ProfilePreviewMode {
  mode: 'public' | 'contacts' | 'organization' | 'private';
  fields: ProfileFieldVisibility[];
}

// Business profile types
export interface BusinessProfileData {
  companyName: string;
  companyLogoUrl?: string;
  companySize?: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+';
  industry?: string;
  companyWebsite?: string;
  position?: string;
  department?: string;
  vatId?: string;
  taxId?: string;
  registrationNumber?: string;
  address?: {
    street_line1: string;
    street_line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
    validated?: boolean;
  };
}

// Enhanced profile type that fixes data model inconsistencies
export interface EnhancedProfile extends Omit<Profile, 'privacySettings'> {
  // Fix name field inconsistency
  firstName?: string;
  lastName?: string;
  displayName?: string;
  
  // Enhanced privacy settings
  privacySettings: PrivacySettings;
  
  // Field-level visibility controls
  fieldVisibility?: ProfileFieldVisibility[];
  
  // Business profile data
  businessProfile?: BusinessProfileData;
  
  // Profile completeness
  completenessScore?: number;
  missingFields?: string[];
  
  // Verification status
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date;
  
  // Social links
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    facebook?: string;
  };
}

// VAT validation schema
const vatValidationPatterns: Record<string, RegExp> = {
  // EU VAT patterns
  AT: /^ATU\d{8}$/,
  BE: /^BE0\d{9}$/,
  BG: /^BG\d{9,10}$/,
  CY: /^CY\d{8}L$/,
  CZ: /^CZ\d{8,10}$/,
  DE: /^DE\d{9}$/,
  DK: /^DK\d{8}$/,
  EE: /^EE\d{9}$/,
  EL: /^EL\d{9}$/,
  ES: /^ES[A-Z]\d{7}[A-Z]$|^ES\d{8}[A-Z]$/,
  FI: /^FI\d{8}$/,
  FR: /^FR[A-Z]{2}\d{9}$/,
  GB: /^GB(\d{9}|\d{12}|(HA|GD)\d{3})$/,
  HR: /^HR\d{11}$/,
  HU: /^HU\d{8}$/,
  IE: /^IE\d{7}[A-Z]{1,2}$|^IE\d[A-Z]\d{5}[A-Z]$/,
  IT: /^IT\d{11}$/,
  LT: /^LT(\d{9}|\d{12})$/,
  LU: /^LU\d{8}$/,
  LV: /^LV\d{11}$/,
  MT: /^MT\d{8}$/,
  NL: /^NL\d{9}B\d{2}$/,
  PL: /^PL\d{10}$/,
  PT: /^PT\d{9}$/,
  RO: /^RO\d{2,10}$/,
  SE: /^SE\d{12}$/,
  SI: /^SI\d{8}$/,
  SK: /^SK\d{10}$/,
  // Other countries
  US: /^\d{2}-\d{7}$/, // EIN format
  CA: /^\d{9}(RT|RP)\d{4}$/, // Business Number
  AU: /^\d{11}$/, // ABN
  NZ: /^\d{8,9}$/, // IRD number
  JP: /^\d{12}$/, // Corporate Number
};

export class EnhancedProfileService implements ProfileService {
  constructor(
    private dataProvider: any,
    private storageService?: any,
    private validationService?: any
  ) {}

  async getProfileByUserId(userId: string): Promise<EnhancedProfile | null> {
    const profile = await this.dataProvider.getProfileByUserId(userId);
    
    if (!profile) {
      return null;
    }
    
    return this.enhanceProfile(profile);
  }

  async updateProfileByUserId(
    userId: string, 
    data: Partial<EnhancedProfile>
  ): Promise<EnhancedProfile> {
    // Validate business profile data if provided
    if (data.businessProfile) {
      await this.validateBusinessProfile(data.businessProfile);
    }
    
    // Map enhanced fields back to database fields
    const dbData = this.mapToDatabase(data);
    
    // Update profile
    const updatedProfile = await this.dataProvider.updateProfileByUserId(userId, dbData);
    
    // Calculate completeness score
    const enhanced = await this.enhanceProfile(updatedProfile);
    enhanced.completenessScore = this.calculateCompleteness(enhanced);
    
    return enhanced;
  }

  // Privacy Controls
  async updatePrivacySettings(
    userId: string,
    settings: Partial<PrivacySettings>
  ): Promise<PrivacySettings> {
    const profile = await this.getProfileByUserId(userId);
    
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    const updatedSettings = {
      ...profile.privacySettings,
      ...settings
    };
    
    await this.updateProfileByUserId(userId, {
      privacySettings: updatedSettings
    });
    
    return updatedSettings;
  }

  async setFieldVisibility(
    userId: string,
    field: string,
    visibility: ProfileFieldVisibility
  ): Promise<void> {
    const profile = await this.getProfileByUserId(userId);
    
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    const fieldVisibility = profile.fieldVisibility || [];
    const existingIndex = fieldVisibility.findIndex(f => f.field === field);
    
    if (existingIndex >= 0) {
      fieldVisibility[existingIndex] = visibility;
    } else {
      fieldVisibility.push(visibility);
    }
    
    await this.updateProfileByUserId(userId, { fieldVisibility });
  }

  async getProfilePreview(
    userId: string,
    mode: 'public' | 'contacts' | 'organization' | 'private'
  ): Promise<Partial<EnhancedProfile>> {
    const profile = await this.getProfileByUserId(userId);
    
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    return this.applyPrivacyFilter(profile, mode);
  }

  // Avatar Upload
  async uploadAvatar(userId: string, file: File): Promise<string> {
    if (!this.storageService) {
      throw new Error('Storage service not configured');
    }
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File size must be less than 5MB');
    }
    
    // Upload to storage
    const path = `avatars/${userId}/${Date.now()}-${file.name}`;
    const url = await this.storageService.upload(path, file, {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000'
    });
    
    // Update profile
    await this.updateProfileByUserId(userId, {
      avatarUrl: url
    });
    
    return url;
  }

  async removeAvatar(userId: string): Promise<void> {
    const profile = await this.getProfileByUserId(userId);
    
    if (profile?.avatarUrl && this.storageService) {
      // Delete from storage
      await this.storageService.delete(profile.avatarUrl);
    }
    
    // Update profile
    await this.updateProfileByUserId(userId, {
      avatarUrl: null
    });
  }

  // Business Profile Features
  async validateVAT(vatId: string, countryCode: string): Promise<boolean> {
    const pattern = vatValidationPatterns[countryCode];
    
    if (!pattern) {
      // Country not supported, basic validation
      return vatId.length > 0 && vatId.length < 20;
    }
    
    return pattern.test(vatId);
  }

  async validateBusinessProfile(data: BusinessProfileData): Promise<void> {
    const errors: string[] = [];
    
    // Validate VAT if provided
    if (data.vatId && data.address?.country) {
      const isValidVAT = await this.validateVAT(data.vatId, data.address.country);
      if (!isValidVAT) {
        errors.push(`Invalid VAT ID for ${data.address.country}`);
      }
    }
    
    // Validate company website
    if (data.companyWebsite) {
      try {
        new URL(data.companyWebsite);
      } catch {
        errors.push('Invalid company website URL');
      }
    }
    
    // Validate address if provided
    if (data.address) {
      if (!data.address.street_line1 || !data.address.city || !data.address.country) {
        errors.push('Incomplete business address');
      }
      
      // US and Canada require state
      if (['US', 'CA'].includes(data.address.country) && !data.address.state) {
        errors.push(`State/Province required for ${data.address.country}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Validation errors: ${errors.join(', ')}`);
    }
  }

  async uploadCompanyLogo(userId: string, file: File): Promise<string> {
    if (!this.storageService) {
      throw new Error('Storage service not configured');
    }
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit for logos
      throw new Error('Logo size must be less than 2MB');
    }
    
    // Upload to storage
    const path = `logos/${userId}/${Date.now()}-${file.name}`;
    const url = await this.storageService.upload(path, file, {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000'
    });
    
    // Update profile
    await this.updateProfileByUserId(userId, {
      businessProfile: {
        companyLogoUrl: url
      }
    });
    
    return url;
  }

  // Profile Completeness
  calculateCompleteness(profile: EnhancedProfile): number {
    const requiredFields = [
      'firstName',
      'lastName',
      'bio',
      'location',
      'avatarUrl'
    ];
    
    const businessFields = profile.userType === 'corporate' ? [
      'businessProfile.companyName',
      'businessProfile.industry',
      'businessProfile.position'
    ] : [];
    
    const allFields = [...requiredFields, ...businessFields];
    const completedFields = allFields.filter(field => {
      const value = this.getNestedValue(profile, field);
      return value !== null && value !== undefined && value !== '';
    });
    
    return Math.round((completedFields.length / allFields.length) * 100);
  }

  getMissingFields(profile: EnhancedProfile): string[] {
    const requiredFields = [
      { field: 'firstName', label: 'First Name' },
      { field: 'lastName', label: 'Last Name' },
      { field: 'bio', label: 'Bio' },
      { field: 'location', label: 'Location' },
      { field: 'avatarUrl', label: 'Profile Picture' }
    ];
    
    if (profile.userType === 'corporate') {
      requiredFields.push(
        { field: 'businessProfile.companyName', label: 'Company Name' },
        { field: 'businessProfile.industry', label: 'Industry' },
        { field: 'businessProfile.position', label: 'Position' }
      );
    }
    
    return requiredFields
      .filter(({ field }) => {
        const value = this.getNestedValue(profile, field);
        return value === null || value === undefined || value === '';
      })
      .map(({ label }) => label);
  }

  // Helper methods
  private enhanceProfile(profile: Profile): EnhancedProfile {
    // Map database fields to enhanced fields
    const enhanced: EnhancedProfile = {
      ...profile,
      // Extract names from database (assuming they might be stored differently)
      firstName: this.extractFirstName(profile),
      lastName: this.extractLastName(profile),
      displayName: this.getDisplayName(profile),
      
      // Default privacy settings if not set
      privacySettings: profile.privacySettings || {
        showEmail: false,
        showPhone: false,
        showLocation: false,
        showBirthDate: false,
        showCompanyInfo: true,
        profileVisibility: 'private',
        allowSearch: true,
        allowMessaging: false,
        dataExportEnabled: true
      },
      
      // Extract business profile if corporate user
      businessProfile: this.extractBusinessProfile(profile),
      
      // Calculate completeness
      completenessScore: 0,
      missingFields: []
    };
    
    enhanced.completenessScore = this.calculateCompleteness(enhanced);
    enhanced.missingFields = this.getMissingFields(enhanced);
    
    return enhanced;
  }

  private mapToDatabase(data: Partial<EnhancedProfile>): Partial<Profile> {
    const dbData: any = { ...data };
    
    // Map enhanced fields back to database fields
    if (data.firstName || data.lastName) {
      // Assuming database stores full name in a 'name' field
      // This needs to be adjusted based on actual database schema
    }
    
    // Map business profile to flat structure if needed
    if (data.businessProfile) {
      Object.assign(dbData, data.businessProfile);
      delete dbData.businessProfile;
    }
    
    return dbData;
  }

  private applyPrivacyFilter(
    profile: EnhancedProfile,
    mode: 'public' | 'contacts' | 'organization' | 'private'
  ): Partial<EnhancedProfile> {
    if (mode === 'private') {
      return profile; // Owner can see everything
    }
    
    const filtered: Partial<EnhancedProfile> = {
      id: profile.id,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      verificationStatus: profile.verificationStatus
    };
    
    const settings = profile.privacySettings;
    const visibility = profile.fieldVisibility || [];
    
    // Apply general privacy settings
    if (settings.profileVisibility === 'public' || mode === settings.profileVisibility) {
      if (settings.showEmail) filtered.email = profile.email;
      if (settings.showPhone) filtered.phoneNumber = profile.phoneNumber;
      if (settings.showLocation) filtered.location = profile.location;
      if (settings.showBirthDate) filtered.dateOfBirth = profile.dateOfBirth;
      if (settings.showCompanyInfo && profile.businessProfile) {
        filtered.businessProfile = profile.businessProfile;
      }
    }
    
    // Apply field-level visibility
    visibility.forEach(({ field, visible, visibleTo }) => {
      if (visible && (visibleTo === 'public' || visibleTo === mode)) {
        const value = this.getNestedValue(profile, field);
        this.setNestedValue(filtered, field, value);
      }
    });
    
    // Always show bio and website if public
    if (mode === 'public') {
      filtered.bio = profile.bio;
      filtered.website = profile.website;
    }
    
    return filtered;
  }

  private extractFirstName(profile: any): string | undefined {
    // Logic to extract first name from profile
    // This depends on how names are stored in the database
    return profile.first_name || profile.firstName;
  }

  private extractLastName(profile: any): string | undefined {
    // Logic to extract last name from profile
    return profile.last_name || profile.lastName;
  }

  private getDisplayName(profile: any): string {
    const firstName = this.extractFirstName(profile);
    const lastName = this.extractLastName(profile);
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    
    return firstName || lastName || profile.email?.split('@')[0] || 'User';
  }

  private extractBusinessProfile(profile: any): BusinessProfileData | undefined {
    if (profile.userType !== 'corporate') {
      return undefined;
    }
    
    return {
      companyName: profile.companyName,
      companyLogoUrl: profile.companyLogoUrl,
      companySize: profile.companySize,
      industry: profile.industry,
      companyWebsite: profile.companyWebsite,
      position: profile.position,
      department: profile.department,
      vatId: profile.vatId,
      address: profile.address
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const props = path.split('.');
    const lastProp = props.pop()!;
    const target = props.reduce((curr, prop) => {
      if (!curr[prop]) curr[prop] = {};
      return curr[prop];
    }, obj);
    target[lastProp] = value;
  }
}