import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiResourceRelationshipService } from "@/services/resource-relationship/factory";
import {
  createMiddlewareChain,
  errorHandlingMiddleware,
  routeAuthMiddleware,
  validationMiddleware,
} from "@/middleware/createMiddlewareChain";
import { createSuccessResponse, createCreatedResponse } from "@/lib/api/common";

const relationshipSchema = z.object({
  parentType: z.string().min(1),
  parentId: z.string().min(1),
  childType: z.string().min(1),
  childId: z.string().min(1),
  relationshipType: z.string().min(1).default("contains"),
});

const middleware = createMiddlewareChain([
  errorHandlingMiddleware(),
  routeAuthMiddleware(),
  validationMiddleware(relationshipSchema),
]);

async function handleGet(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const parentType = url.searchParams.get("parentType");
  const parentId = url.searchParams.get("parentId");
  const childType = url.searchParams.get("childType");
  const childId = url.searchParams.get("childId");

  if (!((parentType && parentId) || (childType && childId))) {
    return NextResponse.json(
      { error: "Must provide either parent or child resource identifiers" },
      { status: 400 },
    );
  }

  const service = getApiResourceRelationshipService();

  if (parentType && parentId) {
    const children = await service.getChildResources(parentType, parentId);
    return createSuccessResponse({ relationships: children });
  } else {
    const parents = await service.getParentResources(childType!, childId!);
    return createSuccessResponse({ relationships: parents });
  }
}

async function handlePost(
  req: NextRequest,
  auth: any,
  data: z.infer<typeof relationshipSchema>,
) {
  const service = getApiResourceRelationshipService();
  const relationship = await service.createRelationship({
    ...data,
    createdBy: auth.userId,
  });

  return createCreatedResponse({ relationship });
}

export const GET = (req: NextRequest) =>
  errorHandlingMiddleware()(routeAuthMiddleware()(handleGet))(req);

export const POST = middleware(handlePost);
