import { type NextRequest, NextResponse } from "next/server";
import {
  createMiddlewareChain,
  errorHandlingMiddleware,
  routeAuthMiddleware,
  validationMiddleware,
  type AuthContext,
} from "@/middleware/createMiddlewareChain";
import { z } from "zod";
import { getApiAdminService } from "@/services/admin/factory";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional().default(""),
  sortBy: z
    .enum(["createdAt", "email", "name", "status"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

type QueryParams = z.infer<typeof querySchema>;

async function handleGet(
  _req: NextRequest,
  _auth: AuthContext,
  params: QueryParams,
) {
  const { page, limit, search, sortBy, sortOrder } = params;

  try {
    const adminService = getApiAdminService();
    const { users, pagination } = await adminService.searchUsers({
      query: search || undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      users,
      pagination: {
        page: pagination.page,
        limit: pagination.pageSize,
        total: pagination.totalItems,
        pages: pagination.totalPages,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const getMiddleware = createMiddlewareChain([
  errorHandlingMiddleware(),
  routeAuthMiddleware({ requiredPermissions: ["admin.users.list"] }),
  validationMiddleware(querySchema),
]);

export const GET = (req: NextRequest) =>
  getMiddleware((r, auth, data) => handleGet(r, auth, data))(req);
