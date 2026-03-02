import { type NextRequest } from "next/server";
import { withErrorHandling } from "@/middleware/error-handling";
import { withRouteAuth } from "@/middleware/auth";
import { createSuccessResponse } from "@/lib/api/common";
import { ResourcePermissionResolver } from "@/lib/services/resource-permission-resolver.service";

async function handleGet(type: string, id: string) {
  const resolver = new ResourcePermissionResolver();
  const ancestors = await resolver.getResourceAncestors(type, id);
  return createSuccessResponse({ ancestors });
}

export const GET = async (
  req: NextRequest,
  ctx: { params: Promise<{ type: string; id: string }> },
) => {
  const { type, id } = await ctx.params;
  return withRouteAuth(
    (r) => withErrorHandling(() => handleGet(type, id), r),
    req,
  );
};
