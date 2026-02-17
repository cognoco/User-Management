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
  type AuthContext,
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
  auth: AuthContext,
  { params }: { params: { id: string } },
) {
  if (!auth.userId) {
    throw new Error("Authentication required");
  }
  const service = getApiSavedSearchService();
  const savedSearch = await service.getSavedSearch(params.id, auth.userId);
  if (!savedSearch) {
    throw new Error("Failed to fetch saved search");
  }
  return createSuccessResponse({ savedSearch });
}

async function updateSavedSearch(
  _req: NextRequest,
  auth: AuthContext,
  data: z.infer<typeof updateSavedSearchSchema>,
  { params }: { params: { id: string } },
) {
  if (!auth.userId) {
    throw new Error("Authentication required");
  }
  const service = getApiSavedSearchService();
  const updatedSearch = await service.updateSavedSearch(
    params.id,
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
  auth: AuthContext,
  { params }: { params: { id: string } },
) {
  if (!auth.userId) {
    throw new Error("Authentication required");
  }
  const service = getApiSavedSearchService();
  await service.deleteSavedSearch(params.id, auth.userId);
  return createNoContentResponse();
}

const baseMiddleware = createMiddlewareChain([
  errorHandlingMiddleware(),
  routeAuthMiddleware({ requiredPermissions: ["admin.users.list"] }),
]);

const patchMiddleware = createMiddlewareChain([
  errorHandlingMiddleware(),
  routeAuthMiddleware({ requiredPermissions: ["admin.users.list"] }),
  validationMiddleware(updateSavedSearchSchema),
]);

export const GET = (req: NextRequest, ctx: { params: { id: string } }) =>
  baseMiddleware((r, auth) => getSavedSearch(r, auth, ctx))(req);

export const PATCH = (req: NextRequest, ctx: { params: { id: string } }) =>
  withSecurity((r) =>
    patchMiddleware((r2, auth, data) => updateSavedSearch(r2, auth, data, ctx))(
      r,
    ),
  )(req);

export const DELETE = (req: NextRequest, ctx: { params: { id: string } }) =>
  withSecurity((r) =>
    baseMiddleware((r2, auth) => deleteSavedSearch(r2, auth, ctx))(r),
  )(req);
