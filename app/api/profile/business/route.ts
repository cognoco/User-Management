import { type NextRequest, NextResponse } from 'next/server';
import { getSessionFromToken } from '@/services/auth/factory';
import { getApiProfileService } from '@/services/profile/factory';
import { getApiPermissionService } from '@/services/permission/factory';
import { PermissionValues } from '@/core/permission/models';
import { checkRateLimit } from '@/middleware/rate-limit';
import { profileSchema } from '@/types/database'; // Corrected import path

// --- GET Handler for fetching business profile --- 
export async function GET(request: NextRequest) {
  // 1. Rate Limiting
  const isRateLimited = await checkRateLimit(request);
  if (isRateLimited) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    // 2. Authentication & Get User
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const user = await getSessionFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const service = getApiProfileService();
    const profileData = await service.getProfileByUserId(user.id);

    if (!profileData) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }

    // 4. Handle missing profile

    // 5. Check User Type & Return Data
    // Validate fetched data against schema to ensure type safety
    const validatedProfile = profileSchema.safeParse(profileData);
    if (!validatedProfile.success) {
        console.error(`Profile data validation failed for user ${user.id}:`, validatedProfile.error);
        return NextResponse.json({ error: 'Invalid profile data format.' }, { status: 500 });
    }

    // Check if user type is corporate
    if (validatedProfile.data.userType !== 'corporate') {
        return NextResponse.json({ error: 'User does not have a business profile.' }, { status: 403 }); // Forbidden
    }

    // Return the full validated profile data (includes personal and business info)
    return NextResponse.json(validatedProfile.data);

  } catch (error) {
    console.error('Unexpected error in GET /api/profile/business:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}

// --- PATCH Handler for updating business profile ---

// Schema for updatable business profile fields
const BusinessProfileUpdateSchema = profileSchema.pick({
    // Select only the business-related fields that can be updated
    companyName: true,
    companySize: true,
    industry: true,
    companyWebsite: true,
    position: true,
    department: true,
    vatId: true,
    address: true,
    // Add personal fields editable by business user if necessary (e.g., bio, location)
    bio: true,
    location: true,
    website: true, // Assuming personal website is also updatable
    phoneNumber: true,
}).partial(); // Allow partial updates

export async function PATCH(request: NextRequest) {
  // 1. Rate Limiting
  const isRateLimited = await checkRateLimit(request);
  if (isRateLimited) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    // 2. Authentication & Get User
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const user = await getSessionFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const service = getApiProfileService();
    const existingProfile = await service.getProfileByUserId(user.id);

    if (!existingProfile) {
        return NextResponse.json({ error: 'Profile not found or error checking permissions.' }, { status: 404 });
    }

    // Permission check using RBAC service
    const permissionService = getApiPermissionService();
    const hasPermission = await permissionService.hasPermission(
      user.id,
      PermissionValues.EDIT_USER_PROFILES
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 4. Parse and Validate Body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const parseResult = BusinessProfileUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Validation failed', details: parseResult.error.format() }, { status: 400 });
    }
    
    const profileUpdates = parseResult.data;

    if (Object.keys(profileUpdates).length === 0) {
        return NextResponse.json({ error: 'No valid fields provided for update.' }, { status: 400 });
    }
    
    // If vatId or companyName changes, set verificationStatus to 'pending'
    let verificationStatusUpdate = {};
    if ((profileUpdates.vatId && profileUpdates.vatId !== existingProfile.vatId) ||
        (profileUpdates.companyName && profileUpdates.companyName !== existingProfile.companyName)) {
      verificationStatusUpdate = { verificationStatus: 'pending' };
    }

    console.log(`Updating business profile for user ${user.id}:`, profileUpdates);

    // Add version check for concurrent updates
    const currentProfile = await service.getProfileByUserId(user.id);
    const requestVersion = (body as any).version;
    if (
      requestVersion !== undefined &&
      (currentProfile as any)?.version !== requestVersion
    ) {
      return NextResponse.json(
        { error: 'Profile was modified by another user' },
        { status: 409 }
      );
    }

    // 5. Update Profile via service
    const updatedData = await service.updateProfileByUserId(user.id, {
      ...profileUpdates,
      ...verificationStatusUpdate,
    });
    if (!updatedData) {
        return NextResponse.json({ error: 'Profile not found after update.' }, { status: 404 });
    }

    // 7. Handle Success
    // Validate the final updated data before sending back
    const validatedUpdatedProfile = profileSchema.safeParse(updatedData);
     if (!validatedUpdatedProfile.success) {
        console.error(`Updated profile data validation failed for user ${user.id}:`, validatedUpdatedProfile.error);
        // Still return success, but log the validation error server-side
        return NextResponse.json({ message: 'Business profile updated successfully, but response validation failed.' });
    } 
    
    // TODO: Add optimistic locking or last-write-wins for concurrent edits in future
    return NextResponse.json(validatedUpdatedProfile.data); // Return the full updated profile

  } catch (error) {
    console.error('Unexpected error in PATCH /api/profile/business:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
} 