import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";

vi.mock("@/middleware/createMiddlewareChain", async () => {
  const actual = await vi.importActual<any>(
    "@/middleware/createMiddlewareChain",
  );
  return {
    ...actual,
    routeAuthMiddleware:
      () => (handler: any) => (req: any, ctx?: any, data?: any) =>
        handler(req, { userId: "u1" }, data),
    validationMiddleware: () => (handler: any) => (req: any, ctx?: any) =>
      handler(req, ctx, {
        name: "n",
        description: "d",
        searchParams: {},
        isPublic: false,
      }),
    errorHandlingMiddleware: () => (handler: any) => handler,
  };
});

vi.mock("@/middleware/with-security", () => ({
  withSecurity: vi.fn((fn: any) => fn),
}));

vi.mock("@/services/saved-search/factory", () => ({
  getApiSavedSearchService: vi.fn(),
}));

import { getApiSavedSearchService } from "@/services/saved-search/factory";

function createRequest(method: string) {
  return {
    method,
    url: "http://localhost/api/admin/saved-searches",
    nextUrl: { pathname: "/api/admin/saved-searches" },
    json: vi.fn().mockResolvedValue({ name: "n", searchParams: {} }),
  } as unknown as NextRequest;
}

describe("saved searches API", () => {
  const mockService = {
    listSavedSearches: vi.fn(),
    createSavedSearch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getApiSavedSearchService as any).mockReturnValue(mockService);
    mockService.listSavedSearches.mockResolvedValue([]);
    mockService.createSavedSearch.mockResolvedValue({ id: "1" });
  });

  it("calls service on GET", async () => {
    const res = await GET(createRequest("GET"));
    expect(res.status).toBe(200);
    expect(mockService.listSavedSearches).toHaveBeenCalledWith("u1");
  });

  it("calls service on POST", async () => {
    const res = await POST(createRequest("POST"));
    expect(res.status).toBe(201);
    expect(mockService.createSavedSearch).toHaveBeenCalled();
  });
});
