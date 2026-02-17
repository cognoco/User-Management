import { NextRequest, NextResponse } from "next/server";
import { getApiCompanyService } from "@/services/company/factory";
import {
  createMiddlewareChain,
  errorHandlingMiddleware,
  routeAuthMiddleware,
  rateLimitMiddleware,
  validationMiddleware,
  type RouteAuthContext,
} from "@/middleware/createMiddlewareChain";
import { z } from "zod";
import { checkPermission } from "@/lib/auth/permissionCheck";
import { PermissionValues } from "@/core/permission/models";

// Validation schema for updating a domain
const domainUpdateSchema = z.object({
  is_primary: z.boolean().optional(),
});

type DomainUpdateRequest = z.infer<typeof domainUpdateSchema>;

const baseMiddleware = createMiddlewareChain([
  rateLimitMiddleware(),
  errorHandlingMiddleware(),
  routeAuthMiddleware(),
]);

const patchMiddleware = createMiddlewareChain([
  rateLimitMiddleware(),
  errorHandlingMiddleware(),
  routeAuthMiddleware(),
  validationMiddleware(domainUpdateSchema),
]);

// DELETE /api/company/domains/[id] - Delete a domain
async function handleDelete(
  _request: NextRequest,
  auth: RouteAuthContext,
  params: { id: string },
) {
  try {
    // 2. Validate domain ID
    const domainId = params.id;
    if (!domainId) {
      return NextResponse.json(
        { error: "Domain ID is required" },
        { status: 400 },
      );
    }

    const companyService = getApiCompanyService();

    const domain = await companyService.getDomainById(domainId);

    if (!domain) {
      console.error(`Error fetching domain ${domainId}`);
      return NextResponse.json({ error: "Domain not found." }, { status: 404 });
    }

    // Check access rights
    const allowed =
      domain.company_id === (await getApiCompanyService().getProfileByUserId(auth.userId!))?.id ||
      (await checkPermission(
        auth.userId!,
        PermissionValues.MANAGE_SETTINGS,
        'company',
        domain.company_id,
      )) ||
      (await checkPermission(auth.userId!, PermissionValues.MANAGE_SETTINGS));
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 5. Check if this is a primary domain - can't delete primary domain
    if (domain.is_primary) {
      return NextResponse.json(
        {
          error:
            "Cannot delete the primary domain. Set another domain as primary first.",
        },
        { status: 400 },
      );
    }

    // 6. Delete the domain
    await companyService.deleteDomain(domainId);

    // 8. Return success
    return NextResponse.json({ message: "Domain deleted successfully." });
  } catch (error) {
    console.error(
      `Unexpected error in DELETE /api/company/domains/${params.id}:`,
      error,
    );
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 },
    );
  }
}

// PATCH /api/company/domains/[id] - Update a domain (currently just primary status)
async function handlePatch(
  _request: NextRequest,
  auth: RouteAuthContext,
  params: { id: string },
  data: DomainUpdateRequest,
) {
  try {
    // 2. Validate domain ID
    const domainId = params.id;
    if (!domainId) {
      return NextResponse.json(
        { error: "Domain ID is required" },
        { status: 400 },
      );
    }

  const companyService = getApiCompanyService();

  const { is_primary } = data;

  const domain = await companyService.getDomainById(domainId);

  if (!domain) {
    console.error(`Error fetching domain ${domainId}`);
    return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  }

  const profile = await companyService.getProfileByUserId(auth.userId!);
  const allowed =
    domain.company_id === profile?.id ||
    (await checkPermission(
      auth.userId!,
      PermissionValues.MANAGE_SETTINGS,
      'company',
      domain.company_id,
    )) ||
    (await checkPermission(auth.userId!, PermissionValues.MANAGE_SETTINGS));
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 6. Special handling for setting a domain as primary
    const updatedDomain = await companyService.updateDomain(domainId, {
      is_primary: is_primary ?? domain.is_primary,
    });

    return NextResponse.json(updatedDomain);
  } catch (error) {
    console.error(
      `Unexpected error in PATCH /api/company/domains/${params.id}:`,
      error,
    );
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 },
    );
  }
}

export const DELETE = (req: NextRequest, ctx: { params: { id: string } }) =>
  baseMiddleware((r, auth) => handleDelete(r, auth, ctx.params))(req);

export const PATCH = (req: NextRequest, ctx: { params: { id: string } }) =>
  patchMiddleware((r, auth, data) => handlePatch(r, auth, ctx.params, data))(
    req,
  );
