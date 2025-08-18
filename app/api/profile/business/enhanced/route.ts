import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { EnhancedProfileService, type BusinessProfileData } from '@/services/profile/enhanced-profile.service';

const AddressSchema = z.object({
  street_line1: z.string().min(1),
  street_line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postal_code: z.string().min(1),
  country: z.string().length(2), // ISO country code
  validated: z.boolean().optional()
});

const BusinessProfileSchema = z.object({
  companyName: z.string().min(1).max(100),
  companyLogoUrl: z.string().url().optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
  industry: z.string().max(100).optional(),
  companyWebsite: z.string().url().optional(),
  position: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  vatId: z.string().max(20).optional(),
  taxId: z.string().max(20).optional(),
  registrationNumber: z.string().max(50).optional(),
  address: AddressSchema.optional()
});

const VATValidationSchema = z.object({
  vatId: z.string(),
  countryCode: z.string().length(2)
});

// GET - Fetch business profile
const getHandler = async ({ 
  userId, 
  services 
}: { 
  userId?: string, 
  services: any 
}) => {
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const profileService = new EnhancedProfileService(services.profile);
  const profile = await profileService.getProfileByUserId(userId);
  
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }
  
  if (profile.userType !== 'corporate') {
    return NextResponse.json({ error: 'Business profile only available for corporate accounts' }, { status: 400 });
  }
  
  return createSuccessResponse({
    businessProfile: profile.businessProfile || {},
    completeness: profile.completenessScore,
    missingFields: profile.missingFields
  });
};

// POST - Update business profile
const postHandler = async ({ 
  data,
  userId, 
  services 
}: { 
  data: z.infer<typeof BusinessProfileSchema>,
  userId?: string, 
  services: any 
}) => {
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const profileService = new EnhancedProfileService(services.profile);
  
  try {
    // Validate business profile data
    await profileService.validateBusinessProfile(data);
    
    // Update profile
    const updatedProfile = await profileService.updateProfileByUserId(userId, {
      businessProfile: data,
      userType: 'corporate' // Ensure user type is set
    });
    
    return createSuccessResponse({
      businessProfile: updatedProfile.businessProfile,
      completeness: updatedProfile.completenessScore,
      message: 'Business profile updated successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update business profile' },
      { status: 400 }
    );
  }
};

// POST /validate-vat - Validate VAT number
const validateVATHandler = async ({ 
  data,
  services 
}: { 
  data: z.infer<typeof VATValidationSchema>,
  services: any 
}) => {
  const profileService = new EnhancedProfileService(services.profile);
  
  try {
    const isValid = await profileService.validateVAT(data.vatId, data.countryCode);
    
    return createSuccessResponse({
      valid: isValid,
      vatId: data.vatId,
      countryCode: data.countryCode
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'VAT validation failed' },
      { status: 400 }
    );
  }
};

// POST /upload-logo - Upload company logo
const uploadLogoHandler = async ({ 
  request,
  userId, 
  services 
}: { 
  request: NextRequest,
  userId?: string, 
  services: any 
}) => {
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    const profileService = new EnhancedProfileService(services.profile, services.storage);
    const logoUrl = await profileService.uploadCompanyLogo(userId, file);
    
    return createSuccessResponse({
      logoUrl,
      message: 'Company logo uploaded successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload logo' },
      { status: 400 }
    );
  }
};

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['profile'],
  requireAuth: true,
  handler: getHandler
});

export const POST = withValidatedServices({
  schema: BusinessProfileSchema,
  requiredServices: ['profile'],
  requireAuth: true,
  handler: postHandler
});