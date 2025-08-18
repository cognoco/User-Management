import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EnhancedProfileService } from '@/services/profile/enhanced-profile.service';
import type { 
  EnhancedProfile, 
  PrivacySettings, 
  BusinessProfileData,
  ProfileFieldVisibility 
} from '@/services/profile/enhanced-profile.service';

// Mock providers
const mockDataProvider = {
  getProfileByUserId: vi.fn(),
  updateProfileByUserId: vi.fn()
};

const mockStorageService = {
  upload: vi.fn(),
  delete: vi.fn()
};

const mockValidationService = {
  validateEmail: vi.fn(),
  validatePhone: vi.fn()
};

describe('Enhanced Profile Service', () => {
  let profileService: EnhancedProfileService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    profileService = new EnhancedProfileService(
      mockDataProvider,
      mockStorageService,
      mockValidationService
    );
  });

  describe('Profile Data Model Alignment', () => {
    it('should enhance profile with correct field mappings', async () => {
      const mockDbProfile = {
        id: 'user_123',
        userId: 'user_123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        userType: 'private',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'Software developer',
        location: 'San Francisco',
        privacySettings: null
      };
      
      mockDataProvider.getProfileByUserId.mockResolvedValue(mockDbProfile);
      
      const profile = await profileService.getProfileByUserId('user_123');
      
      expect(profile).toBeDefined();
      expect(profile?.firstName).toBe('John');
      expect(profile?.lastName).toBe('Doe');
      expect(profile?.displayName).toBe('John Doe');
      expect(profile?.completenessScore).toBeDefined();
      expect(profile?.privacySettings).toBeDefined();
    });

    it('should calculate profile completeness correctly', async () => {
      const completeProfile = {
        id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Developer',
        location: 'NYC',
        avatarUrl: 'https://example.com/avatar.jpg',
        userType: 'private'
      };
      
      mockDataProvider.getProfileByUserId.mockResolvedValue(completeProfile);
      
      const profile = await profileService.getProfileByUserId('user_123');
      
      expect(profile?.completenessScore).toBe(100);
      expect(profile?.missingFields).toHaveLength(0);
    });

    it('should identify missing fields', async () => {
      const incompleteProfile = {
        id: 'user_123',
        firstName: 'John',
        userType: 'private'
      };
      
      mockDataProvider.getProfileByUserId.mockResolvedValue(incompleteProfile);
      
      const profile = await profileService.getProfileByUserId('user_123');
      
      expect(profile?.completenessScore).toBeLessThan(100);
      expect(profile?.missingFields).toContain('Last Name');
      expect(profile?.missingFields).toContain('Bio');
      expect(profile?.missingFields).toContain('Profile Picture');
    });
  });

  describe('Privacy Controls', () => {
    it('should update privacy settings', async () => {
      const mockProfile = {
        id: 'user_123',
        privacySettings: {
          showEmail: false,
          showPhone: false,
          showLocation: false,
          profileVisibility: 'private' as const
        }
      };
      
      mockDataProvider.getProfileByUserId.mockResolvedValue(mockProfile);
      mockDataProvider.updateProfileByUserId.mockResolvedValue({
        ...mockProfile,
        privacySettings: {
          ...mockProfile.privacySettings,
          showEmail: true,
          profileVisibility: 'public' as const
        }
      });
      
      const newSettings: Partial<PrivacySettings> = {
        showEmail: true,
        profileVisibility: 'public'
      };
      
      const updated = await profileService.updatePrivacySettings('user_123', newSettings);
      
      expect(updated.showEmail).toBe(true);
      expect(updated.profileVisibility).toBe('public');
      expect(mockDataProvider.updateProfileByUserId).toHaveBeenCalled();
    });

    it('should set field-level visibility', async () => {
      const mockProfile = {
        id: 'user_123',
        fieldVisibility: []
      };
      
      mockDataProvider.getProfileByUserId.mockResolvedValue(mockProfile);
      mockDataProvider.updateProfileByUserId.mockResolvedValue(mockProfile);
      
      const visibility: ProfileFieldVisibility = {
        field: 'phoneNumber',
        visible: true,
        visibleTo: 'contacts'
      };
      
      await profileService.setFieldVisibility('user_123', 'phoneNumber', visibility);
      
      expect(mockDataProvider.updateProfileByUserId).toHaveBeenCalledWith(
        'user_123',
        expect.objectContaining({
          fieldVisibility: expect.arrayContaining([visibility])
        })
      );
    });

    it('should apply privacy filter for public view', async () => {
      const fullProfile: EnhancedProfile = {
        id: 'user_123',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        bio: 'Developer',
        displayName: 'John Doe',
        avatarUrl: 'avatar.jpg',
        location: 'NYC',
        privacySettings: {
          showEmail: false,
          showPhone: false,
          showLocation: true,
          profileVisibility: 'public',
          showBirthDate: false,
          showCompanyInfo: false,
          allowSearch: true,
          allowMessaging: false,
          dataExportEnabled: true
        }
      } as EnhancedProfile;
      
      mockDataProvider.getProfileByUserId.mockResolvedValue(fullProfile);
      
      const preview = await profileService.getProfilePreview('user_123', 'public');
      
      expect(preview.email).toBeUndefined(); // Hidden
      expect(preview.phoneNumber).toBeUndefined(); // Hidden
      expect(preview.displayName).toBe('John Doe'); // Always visible
      expect(preview.bio).toBe('Developer'); // Public info
    });

    it('should show all fields for private view', async () => {
      const fullProfile = {
        id: 'user_123',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        privacySettings: {
          showEmail: false,
          showPhone: false,
          profileVisibility: 'private'
        }
      };
      
      mockDataProvider.getProfileByUserId.mockResolvedValue(fullProfile);
      
      const preview = await profileService.getProfilePreview('user_123', 'private');
      
      expect(preview.email).toBe('john@example.com'); // Visible to owner
      expect(preview.phoneNumber).toBe('+1234567890'); // Visible to owner
    });
  });

  describe('Avatar Upload', () => {
    it('should upload avatar with validation', async () => {
      const file = new File(['image content'], 'avatar.jpg', { type: 'image/jpeg' });
      const uploadUrl = 'https://storage.example.com/avatar.jpg';
      
      mockStorageService.upload.mockResolvedValue(uploadUrl);
      mockDataProvider.updateProfileByUserId.mockResolvedValue({
        avatarUrl: uploadUrl
      });
      
      const url = await profileService.uploadAvatar('user_123', file);
      
      expect(url).toBe(uploadUrl);
      expect(mockStorageService.upload).toHaveBeenCalledWith(
        expect.stringContaining('avatars/user_123/'),
        file,
        expect.any(Object)
      );
    });

    it('should reject non-image files', async () => {
      const file = new File(['document'], 'doc.pdf', { type: 'application/pdf' });
      
      await expect(
        profileService.uploadAvatar('user_123', file)
      ).rejects.toThrow('File must be an image');
    });

    it('should reject files over 5MB', async () => {
      const largeContent = new Array(6 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      
      await expect(
        profileService.uploadAvatar('user_123', file)
      ).rejects.toThrow('File size must be less than 5MB');
    });

    it('should remove avatar', async () => {
      const mockProfile = {
        avatarUrl: 'https://storage.example.com/avatar.jpg'
      };
      
      mockDataProvider.getProfileByUserId.mockResolvedValue(mockProfile);
      mockStorageService.delete.mockResolvedValue(true);
      mockDataProvider.updateProfileByUserId.mockResolvedValue({
        avatarUrl: null
      });
      
      await profileService.removeAvatar('user_123');
      
      expect(mockStorageService.delete).toHaveBeenCalledWith(mockProfile.avatarUrl);
      expect(mockDataProvider.updateProfileByUserId).toHaveBeenCalledWith(
        'user_123',
        expect.objectContaining({ avatarUrl: null })
      );
    });
  });

  describe('Business Profile Features', () => {
    it('should validate EU VAT numbers', async () => {
      // Valid German VAT
      expect(await profileService.validateVAT('DE123456789', 'DE')).toBe(true);
      
      // Valid French VAT
      expect(await profileService.validateVAT('FRAA123456789', 'FR')).toBe(true);
      
      // Invalid format
      expect(await profileService.validateVAT('DE12345', 'DE')).toBe(false);
      expect(await profileService.validateVAT('FR123456789', 'FR')).toBe(false);
    });

    it('should validate US EIN format', async () => {
      expect(await profileService.validateVAT('12-3456789', 'US')).toBe(true);
      expect(await profileService.validateVAT('123456789', 'US')).toBe(false);
    });

    it('should validate business profile data', async () => {
      const validProfile: BusinessProfileData = {
        companyName: 'Acme Corp',
        companyWebsite: 'https://acme.com',
        vatId: 'DE123456789',
        address: {
          street_line1: '123 Main St',
          city: 'Berlin',
          postal_code: '10115',
          country: 'DE'
        }
      };
      
      await expect(
        profileService.validateBusinessProfile(validProfile)
      ).resolves.not.toThrow();
    });

    it('should reject invalid business website', async () => {
      const invalidProfile: BusinessProfileData = {
        companyName: 'Acme Corp',
        companyWebsite: 'not-a-url'
      };
      
      await expect(
        profileService.validateBusinessProfile(invalidProfile)
      ).rejects.toThrow('Invalid company website URL');
    });

    it('should require state for US addresses', async () => {
      const invalidUSAddress: BusinessProfileData = {
        companyName: 'Acme Corp',
        address: {
          street_line1: '123 Main St',
          city: 'New York',
          postal_code: '10001',
          country: 'US'
          // Missing state
        }
      };
      
      await expect(
        profileService.validateBusinessProfile(invalidUSAddress)
      ).rejects.toThrow('State/Province required for US');
    });

    it('should upload company logo with size limit', async () => {
      const file = new File(['logo'], 'logo.png', { type: 'image/png' });
      const logoUrl = 'https://storage.example.com/logo.png';
      
      mockStorageService.upload.mockResolvedValue(logoUrl);
      mockDataProvider.updateProfileByUserId.mockResolvedValue({
        businessProfile: { companyLogoUrl: logoUrl }
      });
      
      const url = await profileService.uploadCompanyLogo('user_123', file);
      
      expect(url).toBe(logoUrl);
      expect(mockStorageService.upload).toHaveBeenCalledWith(
        expect.stringContaining('logos/user_123/'),
        file,
        expect.any(Object)
      );
    });

    it('should reject logo files over 2MB', async () => {
      const largeContent = new Array(3 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large-logo.png', { type: 'image/png' });
      
      await expect(
        profileService.uploadCompanyLogo('user_123', file)
      ).rejects.toThrow('Logo size must be less than 2MB');
    });

    it('should calculate completeness for corporate profiles', async () => {
      const corporateProfile = {
        id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        bio: 'CEO',
        location: 'NYC',
        avatarUrl: 'avatar.jpg',
        userType: 'corporate',
        businessProfile: {
          companyName: 'Acme Corp',
          industry: 'Technology',
          position: 'CEO'
        }
      };
      
      mockDataProvider.getProfileByUserId.mockResolvedValue(corporateProfile);
      
      const profile = await profileService.getProfileByUserId('user_123');
      
      expect(profile?.completenessScore).toBe(100);
      expect(profile?.missingFields).toHaveLength(0);
    });

    it('should identify missing business fields', async () => {
      const incompleteCorpProfile = {
        id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'corporate',
        businessProfile: {
          companyName: 'Acme Corp'
          // Missing industry and position
        }
      };
      
      mockDataProvider.getProfileByUserId.mockResolvedValue(incompleteCorpProfile);
      
      const profile = await profileService.getProfileByUserId('user_123');
      
      expect(profile?.missingFields).toContain('Industry');
      expect(profile?.missingFields).toContain('Position');
    });
  });

  describe('Profile Preview Modes', () => {
    it('should show different fields based on visibility mode', async () => {
      const profile: EnhancedProfile = {
        id: 'user_123',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        bio: 'Developer',
        displayName: 'John Doe',
        avatarUrl: 'avatar.jpg',
        website: 'https://johndoe.com',
        businessProfile: {
          companyName: 'Acme Corp',
          position: 'CEO'
        },
        privacySettings: {
          showEmail: true,
          showPhone: true,
          showCompanyInfo: true,
          profileVisibility: 'contacts',
          showLocation: false,
          showBirthDate: false,
          allowSearch: true,
          allowMessaging: true,
          dataExportEnabled: true
        }
      } as EnhancedProfile;
      
      mockDataProvider.getProfileByUserId.mockResolvedValue(profile);
      
      // Public view - limited fields
      const publicView = await profileService.getProfilePreview('user_123', 'public');
      expect(publicView.email).toBeUndefined();
      expect(publicView.phoneNumber).toBeUndefined();
      expect(publicView.bio).toBe('Developer');
      expect(publicView.website).toBe('https://johndoe.com');
      
      // Contacts view - more fields
      const contactsView = await profileService.getProfilePreview('user_123', 'contacts');
      expect(contactsView.email).toBe('john@example.com');
      expect(contactsView.phoneNumber).toBe('+1234567890');
      expect(contactsView.businessProfile).toBeDefined();
      
      // Organization view
      const orgView = await profileService.getProfilePreview('user_123', 'organization');
      expect(orgView.businessProfile).toBeUndefined(); // Not org visibility
      
      // Private view - all fields
      const privateView = await profileService.getProfilePreview('user_123', 'private');
      expect(privateView.email).toBe('john@example.com');
      expect(privateView.phoneNumber).toBe('+1234567890');
      expect(privateView.businessProfile).toBeDefined();
    });
  });
});