import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiCompanyService } from "@/services/company/factory";
import { createApiHandler, emptySchema } from "@/lib/api/route-helpers";
import { createSuccessResponse } from "@/lib/api/common";
import { logUserAction } from "@/lib/audit/auditLogger";
import type { AuthContext } from "@/core/config/interfaces";
import { withSecurity } from "@/middleware/with-security";
import { checkRateLimit } from "@/middleware/rate-limit";
import { PermissionValues } from "@/types/rbac";
import { companyProfileUpdateSchema } from "@/lib/schemas/profile.schema";

// Company Profile Schema
const CompanyProfileSchema = z.object({
  name: z.string().min(2).max(100),
  legal_name: z.string().min(2).max(100),
  registration_number: z.string().optional(),
  tax_id: z.string().optional(),
  website: z.string().url().optional(),
  industry: z.string().min(2).max(50),
  size_range: z.enum([
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "501-1000",
    "1000+",
  ]),
  founded_year: z.number().int().min(1800).max(new Date().getFullYear()),
  description: z.string().max(1000).optional(),
});

type CompanyProfileRequest = z.infer<typeof CompanyProfileSchema>;
type CompanyProfileUpdateRequest = z.infer<typeof companyProfileUpdateSchema>;


async function handlePost(
  request: NextRequest,
  auth: AuthContext,
  data?: CompanyProfileRequest,
) {
  const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("user-agent");
  if (await checkRateLimit(request)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  let userIdForLogging: string | null = null;

  try {
    const companyService = getApiCompanyService();
    const userId = auth.userId!;
    userIdForLogging = userId;

    const existingProfile = await companyService.getProfileByUserId(userId);

    if (existingProfile) {
      await logUserAction({
        userId: userIdForLogging,
        action: "COMPANY_PROFILE_CREATE_DUPLICATE_ATTEMPT",
        status: "FAILURE",
        ipAddress,
        userAgent,
        targetResourceType: "company_profile",
        targetResourceId: userIdForLogging,
        details: { existingProfileId: existingProfile.id },
      });
      return NextResponse.json(
        { error: "User already has a company profile" },
        { status: 409 },
      );
    }

    const profile = await companyService.createProfile(userId, data!);

    if (!profile) {
      console.error("Error creating company profile");
      await logUserAction({
        userId: userIdForLogging,
        action: "COMPANY_PROFILE_CREATE_FAILURE",
        status: "FAILURE",
        ipAddress,
        userAgent,
        targetResourceType: "company_profile",
        targetResourceId: userIdForLogging,
        details: { reason: "unknown" },
      });
      return NextResponse.json(
        { error: "Failed to create company profile" },
        { status: 500 },
      );
    }

    await logUserAction({
      userId: userIdForLogging,
      action: "COMPANY_PROFILE_CREATE_SUCCESS",
      status: "SUCCESS",
      ipAddress,
      userAgent,
      targetResourceType: "company_profile",
      targetResourceId: profile.id,
      details: { companyName: profile.name },
    });

    return createSuccessResponse(profile);
  } catch (error) {
    console.error("Unexpected error in POST /api/company/profile:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    await logUserAction({
      userId: userIdForLogging,
      action: "COMPANY_PROFILE_CREATE_UNEXPECTED_ERROR",
      status: "FAILURE",
      ipAddress,
      userAgent,
      targetResourceType: "company_profile",
      targetResourceId: userIdForLogging,
      details: { error: message },
    });
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 },
    );
  }
}
export const POST = withSecurity((req: NextRequest) =>
  createApiHandler(
    CompanyProfileSchema,
    (r, a, d) => handlePost(r, a, d),
    { requireAuth: true, requiredPermissions: [PermissionValues.EDIT_USER_PROFILES] }
  )(req)
);

async function handleGet(
  request: NextRequest,
  auth: AuthContext,
  _data: unknown,
) {
  const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("user-agent");
  if (await checkRateLimit(request)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    const userId = auth.userId!;
    const profile = await getApiCompanyService().getProfileByUserId(userId);

    if (!profile) {
      await logUserAction({
        userId,
        action: "COMPANY_PROFILE_GET_NOT_FOUND",
        status: "FAILURE",
        ipAddress,
        userAgent,
        targetResourceType: "company_profile",
        targetResourceId: userId,
      });
      return NextResponse.json(
        { error: "Company profile not found" },
        { status: 404 },
      );
    }
    await logUserAction({
      userId,
      action: "COMPANY_PROFILE_GET_SUCCESS",
      status: "SUCCESS",
      ipAddress,
      userAgent,
      targetResourceType: "company_profile",
      targetResourceId: userId,
    });
    return createSuccessResponse(profile);
  } catch (error) {
    console.error("Unexpected error in GET /api/company/profile:", error);
    await logUserAction({
      userId: auth.userId!,
      action: "COMPANY_PROFILE_GET_ERROR",
      status: "FAILURE",
      ipAddress,
      userAgent,
      targetResourceType: "company_profile",
      targetResourceId: auth.userId!,
      details: { error: (error as Error).message },
    });
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 },
    );
  }
}

export const GET = withSecurity((req: NextRequest) =>
  createApiHandler(emptySchema, (r, a, d) => handleGet(r, a, d), {
    requireAuth: true,
    requiredPermissions: [PermissionValues.EDIT_USER_PROFILES],
  })(req)
);

async function handlePut(
  request: NextRequest,
  auth: AuthContext,
  data: CompanyProfileUpdateRequest,
) {
  // Get IP and User Agent early
  const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("user-agent");
  if (await checkRateLimit(request)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  let userIdForLogging: string | null = null;
  let companyProfileIdForLogging: string | null = null;

  try {
    const companyService = getApiCompanyService();
    const userId = auth.userId!;
    userIdForLogging = userId;

    const existingProfile = await companyService.getProfileByUserId(userId);

    if (!existingProfile) {
      // Log attempt to update non-existent profile
      await logUserAction({
        userId: userIdForLogging,
        action: "COMPANY_PROFILE_UPDATE_NOT_FOUND",
        status: "FAILURE",
        ipAddress: ipAddress,
        userAgent: userAgent,
        targetResourceType: "company_profile",
        targetResourceId: userIdForLogging, // Target is the user
        details: { reason: "Company profile not found for user" },
      });
      return NextResponse.json(
        { error: "Company profile not found" },
        { status: 404 },
      );
    }
    companyProfileIdForLogging = existingProfile.id; // Store for logging

    // 4. Update Profile
    const fieldsToUpdate = data;
    const updatedProfile = await companyService.updateProfile(
      companyProfileIdForLogging,
      fieldsToUpdate,
    );

    if (!updatedProfile) {
      console.error("Error updating company profile");
      await logUserAction({
        userId: userIdForLogging,
        action: "COMPANY_PROFILE_UPDATE_FAILURE",
        status: "FAILURE",
        ipAddress: ipAddress,
        userAgent: userAgent,
        targetResourceType: "company_profile",
        targetResourceId: companyProfileIdForLogging,
        details: { attemptedFields: Object.keys(fieldsToUpdate) },
      });
      return NextResponse.json(
        { error: "Failed to update company profile" },
        { status: 500 },
      );
    }

    // Log successful update
    await logUserAction({
      userId: userIdForLogging,
      action: "COMPANY_PROFILE_UPDATE_SUCCESS",
      status: "SUCCESS",
      ipAddress: ipAddress,
      userAgent: userAgent,
      targetResourceType: "company_profile",
      targetResourceId: companyProfileIdForLogging,
      details: { updatedFields: Object.keys(fieldsToUpdate) }, // Log which fields were updated
    });

    return createSuccessResponse(updatedProfile);
  } catch (error) {
    console.error("Unexpected error in PUT /api/company/profile:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    // Log unexpected error
    await logUserAction({
      userId: userIdForLogging, // May be null
      action: "COMPANY_PROFILE_UPDATE_UNEXPECTED_ERROR",
      status: "FAILURE",
      ipAddress: ipAddress,
      userAgent: userAgent,
      targetResourceType: "company_profile",
      targetResourceId: companyProfileIdForLogging, // May be null
      details: { error: message },
    });
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 },
    );
  }
}

export const PUT = withSecurity((req: NextRequest) =>
  createApiHandler(
    companyProfileUpdateSchema,
    (r, a, d) => handlePut(r, a, d),
    { requireAuth: true, requiredPermissions: [PermissionValues.EDIT_USER_PROFILES] }
  )(req)
);

async function handleDelete(
  request: NextRequest,
  auth: AuthContext,
) {
  // Get IP and User Agent early
  const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("user-agent");
  if (await checkRateLimit(request)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  let userIdForLogging: string | null = null;
  let companyProfileIdForLogging: string | null = null;

  try {
    const companyService = getApiCompanyService();
    const userId = auth.userId!;
    userIdForLogging = userId;

    const profileToDelete = await companyService.getProfileByUserId(userId);

    if (!profileToDelete) {
      // Log attempt to delete non-existent profile
      await logUserAction({
        userId: userIdForLogging,
        action: "COMPANY_PROFILE_DELETE_NOT_FOUND",
        status: "FAILURE",
        ipAddress: ipAddress,
        userAgent: userAgent,
        targetResourceType: "company_profile",
        targetResourceId: userIdForLogging, // Target is the user
        details: { reason: "Company profile not found to delete" },
      });
      return NextResponse.json(
        { error: "Company profile not found to delete" },
        { status: 404 },
      );
    }
    companyProfileIdForLogging = profileToDelete.id;

    const deleteError = await companyService
      .deleteProfile(companyProfileIdForLogging)
      .then(() => null)
      .catch((e) => {
        console.error("Error deleting company profile:", e);
        return e;
      });

    if (deleteError) {
      // Log deletion failure
      await logUserAction({
        userId: userIdForLogging,
        action: "COMPANY_PROFILE_DELETE_FAILURE",
        status: "FAILURE",
        ipAddress: ipAddress,
        userAgent: userAgent,
        targetResourceType: "company_profile",
        targetResourceId: companyProfileIdForLogging,
        details: {
          reason: deleteError.message,
          code: deleteError.code,
        },
      });
      return NextResponse.json(
        { error: "Failed to delete company profile" },
        { status: 500 },
      );
    }

    // Log successful deletion
    await logUserAction({
      userId: userIdForLogging,
      action: "COMPANY_PROFILE_DELETE_SUCCESS",
      status: "SUCCESS",
      ipAddress: ipAddress,
      userAgent: userAgent,
      targetResourceType: "company_profile",
      targetResourceId: companyProfileIdForLogging,
    });

    return createSuccessResponse({ success: true });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/company/profile:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    // Log unexpected error
    await logUserAction({
      userId: userIdForLogging, // May be null
      action: "COMPANY_PROFILE_DELETE_UNEXPECTED_ERROR",
      status: "FAILURE",
      ipAddress: ipAddress,
      userAgent: userAgent,
      targetResourceType: "company_profile",
      targetResourceId: companyProfileIdForLogging, // May be null
      details: { error: message },
    });
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 },
    );
  }
}

export const DELETE = withSecurity((req: NextRequest) =>
  createApiHandler(emptySchema, (r, a, d) => handleDelete(r, a), {
    requireAuth: true,
    requiredPermissions: [PermissionValues.EDIT_USER_PROFILES],
  })(req)
);
