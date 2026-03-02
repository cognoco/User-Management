import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiCompanyService } from "@/services/company/factory";
import { type AuthContext } from "@/core/config/interfaces";
import { createApiHandler } from "@/lib/api/route-helpers";
import { createSuccessResponse } from "@/lib/api/common";


// --- DELETE Handler for removing company documents ---
async function handleDelete(
  _request: NextRequest,
  params: { documentId: string },
  auth: AuthContext,
) {
  try {
    const companyService = getApiCompanyService();
    const userId = auth.userId!;

    const companyProfile = await companyService.getProfileByUserId(userId);

    if (!companyProfile) {
      return NextResponse.json(
        { error: "Company profile not found" },
        { status: 404 },
      );
    }

    const document = await companyService.getDocument(
      companyProfile.id,
      params.documentId,
    );

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    await companyService.deleteDocument(companyProfile.id, params.documentId);

    return createSuccessResponse({ success: true });
  } catch (error) {
    console.error(
      "Unexpected error in DELETE /api/company/documents/[documentId]:",
      error,
    );
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 },
    );
  }
}

export const DELETE = async (
  req: NextRequest,
  ctx: { params: Promise<{ documentId: string }> }
) => {
  const params = await ctx.params;
  return createApiHandler(
    z.object({}),
    (r, a) => handleDelete(r, params, a),
    { requireAuth: true }
  )(req);
};
