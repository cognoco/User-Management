import { z } from "zod";
import { withValidatedServices } from "@/lib/api/with-services";
import { createSuccessResponse, ApiError } from "@/lib/api/common";


// --- DELETE Handler for removing company documents ---
export const DELETE = withValidatedServices({
  schema: z.object({}),
  requiredServices: ['company'],
  requireAuth: true,
  handler: async ({ params, auth, services }) => {
    const userId = auth.userId!;
    const companyProfile = await services.company.getProfileByUserId(userId);

    if (!companyProfile) {
      throw new ApiError('Company profile not found', 404);
    }

    const document = await services.company.getDocument(
      companyProfile.id,
      params.documentId,
    );

    if (!document) {
      throw new ApiError('Document not found', 404);
    }

    await services.company.deleteDocument(companyProfile.id, params.documentId);

    return createSuccessResponse({ success: true });
  },
});
