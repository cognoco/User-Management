import { z } from "zod";
import { withValidatedServices } from "@/lib/api/with-services";
import { createSuccessResponse, ApiError } from "@/lib/api/common";
import { logUserAction } from "@/lib/audit/auditLogger";
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

export const POST = withSecurity(
  withValidatedServices({
    schema: CompanyProfileSchema,
    requiredServices: ['company'],
    requireAuth: true,
    requiredPermissions: [PermissionValues.EDIT_USER_PROFILES],
    handler: async ({ request, auth, data, services }) => {
      const ipAddress = request.ip;
      const userAgent = request.headers.get("user-agent");
      
      if (await checkRateLimit(request)) {
        throw new ApiError('Too many requests', 429);
      }
      
      const userId = auth.userId!;
      const existingProfile = await services.company.getProfileByUserId(userId);

      if (existingProfile) {
        await logUserAction({
          userId,
          action: "COMPANY_PROFILE_CREATE_DUPLICATE_ATTEMPT",
          status: "FAILURE",
          ipAddress,
          userAgent,
          targetResourceType: "company_profile",
          targetResourceId: userId,
          details: { existingProfileId: existingProfile.id },
        });
        throw new ApiError("User already has a company profile", 409);
      }

      const profile = await services.company.createProfile(userId, data);

      if (!profile) {
        console.error("Error creating company profile");
        await logUserAction({
          userId,
          action: "COMPANY_PROFILE_CREATE_FAILURE",
          status: "FAILURE",
          ipAddress,
          userAgent,
          targetResourceType: "company_profile",
          targetResourceId: userId,
          details: { reason: "unknown" },
        });
        throw new ApiError("Failed to create company profile", 500);
      }

      await logUserAction({
        userId,
        action: "COMPANY_PROFILE_CREATE_SUCCESS",
        status: "SUCCESS",
        ipAddress,
        userAgent,
        targetResourceType: "company_profile",
        targetResourceId: profile.id,
        details: { companyName: profile.name },
      });

      return createSuccessResponse(profile);
    },
  })
);

export const GET = withSecurity(
  withValidatedServices({
    schema: z.object({}),
    requiredServices: ['company'],
    requireAuth: true,
    requiredPermissions: [PermissionValues.EDIT_USER_PROFILES],
    handler: async ({ request, auth, services }) => {
      const ipAddress = request.ip;
      const userAgent = request.headers.get("user-agent");
      
      if (await checkRateLimit(request)) {
        throw new ApiError('Too many requests', 429);
      }
      
      const userId = auth.userId!;
      const profile = await services.company.getProfileByUserId(userId);

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
        throw new ApiError("Company profile not found", 404);
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
    },
  })
);

export const PUT = withSecurity(
  withValidatedServices({
    schema: companyProfileUpdateSchema,
    requiredServices: ['company'],
    requireAuth: true,
    requiredPermissions: [PermissionValues.EDIT_USER_PROFILES],
    handler: async ({ request, auth, data, services }) => {
      const ipAddress = request.ip;
      const userAgent = request.headers.get("user-agent");
      
      if (await checkRateLimit(request)) {
        throw new ApiError('Too many requests', 429);
      }
      
      const userId = auth.userId!;
      const existingProfile = await services.company.getProfileByUserId(userId);

      if (!existingProfile) {
        await logUserAction({
          userId,
          action: "COMPANY_PROFILE_UPDATE_NOT_FOUND",
          status: "FAILURE",
          ipAddress,
          userAgent,
          targetResourceType: "company_profile",
          targetResourceId: userId,
          details: { reason: "Company profile not found for user" },
        });
        throw new ApiError("Company profile not found", 404);
      }

      const updatedProfile = await services.company.updateProfile(
        existingProfile.id,
        data,
      );

      if (!updatedProfile) {
        console.error("Error updating company profile");
        await logUserAction({
          userId,
          action: "COMPANY_PROFILE_UPDATE_FAILURE",
          status: "FAILURE",
          ipAddress,
          userAgent,
          targetResourceType: "company_profile",
          targetResourceId: existingProfile.id,
          details: { attemptedFields: Object.keys(data) },
        });
        throw new ApiError("Failed to update company profile", 500);
      }

      await logUserAction({
        userId,
        action: "COMPANY_PROFILE_UPDATE_SUCCESS",
        status: "SUCCESS",
        ipAddress,
        userAgent,
        targetResourceType: "company_profile",
        targetResourceId: existingProfile.id,
        details: { updatedFields: Object.keys(data) },
      });

      return createSuccessResponse(updatedProfile);
    },
  })
);

export const DELETE = withSecurity(
  withValidatedServices({
    schema: z.object({}),
    requiredServices: ['company'],
    requireAuth: true,
    requiredPermissions: [PermissionValues.EDIT_USER_PROFILES],
    handler: async ({ request, auth, services }) => {
      const ipAddress = request.ip;
      const userAgent = request.headers.get("user-agent");
      
      if (await checkRateLimit(request)) {
        throw new ApiError('Too many requests', 429);
      }
      
      const userId = auth.userId!;
      const profileToDelete = await services.company.getProfileByUserId(userId);

      if (!profileToDelete) {
        await logUserAction({
          userId,
          action: "COMPANY_PROFILE_DELETE_NOT_FOUND",
          status: "FAILURE",
          ipAddress,
          userAgent,
          targetResourceType: "company_profile",
          targetResourceId: userId,
          details: { reason: "Company profile not found to delete" },
        });
        throw new ApiError("Company profile not found to delete", 404);
      }

      try {
        await services.company.deleteProfile(profileToDelete.id);
      } catch (deleteError: any) {
        console.error("Error deleting company profile:", deleteError);
        await logUserAction({
          userId,
          action: "COMPANY_PROFILE_DELETE_FAILURE",
          status: "FAILURE",
          ipAddress,
          userAgent,
          targetResourceType: "company_profile",
          targetResourceId: profileToDelete.id,
          details: {
            reason: deleteError.message,
            code: deleteError.code,
          },
        });
        throw new ApiError("Failed to delete company profile", 500);
      }

      await logUserAction({
        userId,
        action: "COMPANY_PROFILE_DELETE_SUCCESS",
        status: "SUCCESS",
        ipAddress,
        userAgent,
        targetResourceType: "company_profile",
        targetResourceId: profileToDelete.id,
      });

      return createSuccessResponse({ success: true });
    },
  })
);