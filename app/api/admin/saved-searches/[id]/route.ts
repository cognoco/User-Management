import { type NextRequest } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  createNoContentResponse,
} from "@/lib/api/common";
import {
  createMiddlewareChain,
  errorHandlingMiddleware,
  routeAuthMiddleware,
  validationMiddleware,
  type RouteAuthContext,
} from "@/middleware/createMiddlewareChain";
import { withSecurity } from "@/middleware/with-security";
import { getApiSavedSearchService } from "@/services/saved-search/factory";

const updateSavedSearchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  searchParams: z.record(z.any()).optional(),
  isPublic: z.boolean().optional(),
});

async function getSavedSearch(
  _req: NextRequest,
  auth: RouteAuthContext,
  id: string,
) {
  if (!auth.userId) {
    throw new Error("Authentication required");
  }
  const service = getApiSavedSearchService();
  const savedSearch = await service.getSavedSearch(id, auth.userId);
  if (!savedSearch) {
    throw new Error("Failed to fetch saved search");
  }
  return createSuccessResponse({ savedSearch });
}

async function updateSavedSearch(
  _req: NextRequest,
  auth: RouteAuthContext,
  data: z.infer<typeof updateSavedSearchSchema>,
  id: string,
) {
  if (!auth.userId) {
    throw new Error("Authentication required");
  }
  const service = getApiSavedSearchService();
  const updatedSearch = await service.updateSavedSearch(
    id,
    auth.userId,
    {
      name: data.name,
      description: data.description,
      searchParams: data.searchParams,
      isPublic: data.isPublic,
    },
  );
  return createSuccessResponse({ savedSearch: updatedSearch });
}

async function deleteSavedSearch(
  _req: NextRequest,
  auth: RouteAuthContext,
  id: string,
) {
  if (!auth.userId) {
    throw new Error("Authentication required");
  }
  const service = getApiSavedSearchService();
  await service.deleteSavedSearch(id, auth.userId);
  return createNoContentResponse();
}

const baseMiddleware = createMiddlewareChain([
  errorHandlingMiddleware(),
  routeAuthMiddleware({ requiredPermissions: ["ADMIN_ACCESS"] }),
]);

const patchMiddleware = createMiddlewareChain([
  errorHandlingMiddleware(),
  routeAuthMiddleware({ requiredPermissions: ["ADMIN_ACCESS"] }),
  validationMiddleware(updateSavedSearchSchema),
]);

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return baseMiddleware((r, auth) => getSavedSearch(r, auth, id))(req);
};

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return withSecurity((r) =>
    patchMiddleware((r2, auth, data) => updateSavedSearch(r2, auth, data, id))(r),
  )(req);
};

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return withSecurity((r) =>
    baseMiddleware((r2, auth) => deleteSavedSearch(r2, auth, id))(r),
  )(req);
};
