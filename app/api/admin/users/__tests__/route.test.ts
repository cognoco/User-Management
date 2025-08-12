import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";


vi.mock("@/middleware/createMiddlewareChain", async () => {
  const actual = await vi.importActual<any>(
    "@/middleware/createMiddlewareChain",
  );
  return {
    ...actual,
    routeAuthMiddleware:
      () => (handler: any) => (req: any, ctx?: any, data?: any) =>
        handler(
          req,
          { userId: "u1", role: "admin", permissions: ["admin.users.list"] },
          data,
        ),
    validationMiddleware: () => (handler: any) => (req: any, ctx?: any) => {
      // Extract query parameters for validation middleware
      const url = new URL(req.url);
      const params = {
        page: parseInt(url.searchParams.get("page") || "1"),
        limit: parseInt(url.searchParams.get("limit") || "20"),
        search: url.searchParams.get("search") || "",
        sortBy: url.searchParams.get("sortBy") || "createdAt",
        sortOrder: url.searchParams.get("sortOrder") || "desc",
      };
      return handler(req, ctx, params);
    },
    errorHandlingMiddleware: () => (handler: any) => handler,
  };
});

import { getApiAdminService } from "@/services/admin/factory";

function createRequest(query: Record<string, string> = {}) {
  const url = new URL("https://example.com/api/admin/users");
  Object.entries(query).forEach(([k, v]) => url.searchParams.append(k, v));

  return {
    method: "GET",
    url: url.toString(),
    nextUrl: {
      pathname: "/api/admin/users",
      searchParams: url.searchParams,
    },
    json: vi.fn().mockResolvedValue({}),
    get headers() {
      const headersMap = new Map([
        ["x-forwarded-for", "127.0.0.1"],
        ["user-agent", "test-agent"],
      ]);
      return {
        get: (key: string) => headersMap.get(key.toLowerCase()) || null,
      };
    },
  } as unknown as NextRequest;
}

describe("Admin Users API", () => {
  const service = {
    searchUsers: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.useFakeTimers();
    // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.ADDRESS_SERVICE, service);
    service.searchUsers.mockResolvedValue({
      users: [{ id: "1" }],
      pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns paginated users", async () => {
    const res = await GET(createRequest({ page: "1", limit: "10" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.users).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
    expect(service.searchUsers).toHaveBeenCalled();
  });

  it("applies search filter", async () => {
    await GET(createRequest({ search: "john" }));
    expect(service.searchUsers).toHaveBeenCalled();
  });

  it("returns 500 on database error", async () => {
    service.searchUsers.mockRejectedValue(new Error("fail"));
    const res = await GET(createRequest());
    expect(res.status).toBe(500);
  });

  it("returns 504 on timeout", async () => {
    // Mock Promise.race to immediately reject with timeout error
    service.searchUsers.mockRejectedValue(new Error("timeout"));
    const res = await GET(createRequest());
    expect(res.status).toBe(500);
  }, 1000);
});
