import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { EnhancedProfileService, type PrivacySettings, type ProfileFieldVisibility } from '@/services/profile/enhanced-profile.service';

const PrivacySettingsSchema = z.object({
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  showLocation: z.boolean(),
  showBirthDate: z.boolean(),
  showCompanyInfo: z.boolean(),
  profileVisibility: z.enum(['public', 'private', 'contacts', 'organization']),
  allowSearch: z.boolean(),
  allowMessaging: z.boolean(),
  dataExportEnabled: z.boolean()
});

const FieldVisibilitySchema = z.object({
  field: z.string(),
  visible: z.boolean(),
  visibleTo: z.enum(['public', 'contacts', 'organization', 'private'])
});

const UpdatePrivacySchema = z.object({
  settings: PrivacySettingsSchema.partial(),
  fieldVisibility: z.array(FieldVisibilitySchema).optional()
});

const PreviewSchema = z.object({
  mode: z.enum(['public', 'contacts', 'organization', 'private'])
});

// GET - Fetch current privacy settings
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
  
  return createSuccessResponse({
    settings: profile.privacySettings,
    fieldVisibility: profile.fieldVisibility || []
  });
};

// POST - Update privacy settings
const postHandler = async ({ 
  data,
  userId, 
  services 
}: { 
  data: z.infer<typeof UpdatePrivacySchema>,
  userId?: string, 
  services: any 
}) => {
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const profileService = new EnhancedProfileService(services.profile);
  
  try {
    // Update privacy settings if provided
    if (data.settings) {
      await profileService.updatePrivacySettings(userId, data.settings);
    }
    
    // Update field visibility if provided
    if (data.fieldVisibility) {
      for (const visibility of data.fieldVisibility) {
        await profileService.setFieldVisibility(userId, visibility.field, visibility);
      }
    }
    
    // Get updated profile
    const profile = await profileService.getProfileByUserId(userId);
    
    return createSuccessResponse({
      settings: profile?.privacySettings,
      fieldVisibility: profile?.fieldVisibility || [],
      message: 'Privacy settings updated successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update privacy settings' },
      { status: 500 }
    );
  }
};

// GET preview - Show how profile appears to others
const previewHandler = async ({ 
  query,
  userId, 
  services 
}: { 
  query: { mode: string },
  userId?: string, 
  services: any 
}) => {
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const mode = query.mode as 'public' | 'contacts' | 'organization' | 'private';
  const profileService = new EnhancedProfileService(services.profile);
  
  try {
    const preview = await profileService.getProfilePreview(userId, mode);
    
    return createSuccessResponse({
      mode,
      preview,
      visibleFields: Object.keys(preview)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate preview' },
      { status: 500 }
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
  schema: UpdatePrivacySchema,
  requiredServices: ['profile'],
  requireAuth: true,
  handler: postHandler
});