import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "../route";

// Mock the middleware chain to properly pass auth context
vi.mock("@/middleware/createMiddlewareChain", () => ({
  routeAuthMiddleware: vi.fn(() => (handler: any) => async (req: any) => {
    const authContext = { userId: "u1", user: { id: "u1" }, role: "ADMIN" };
    return handler(req, authContext);
  }),
  validationMiddleware: vi.fn(() => (handler: any) => async (req: any, ctx?: any) => {
    const data = { name: "updated-name" };
    return handler(req, ctx, data);
  }),
  errorHandlingMiddleware: vi.fn(() => (handler: any) => handler),
  createMiddlewareChain: vi.fn((middlewares: any[]) => (handler: any) => {
    return async (req: any) => {
      const authContext = { userId: "u1", user: { id: "u1" }, role: "ADMIN" };
      const data = { name: "updated-name" };
      return handler(req, authContext, data);
    };
  }),
}));

vi.mock("@/middleware/with-security", () => ({
  withSecurity: vi.fn((fn: any) => fn),
}));

const mockService = {
  getSavedSearch: vi.fn(),
  updateSavedSearch: vi.fn(),
  deleteSavedSearch: vi.fn(),
};

vi.mock("@/services/saved-search/factory", () => ({
  getApiSavedSearchService: vi.fn(() => mockService),
}));

function createReq(method: string) {
  return {
    method,
    url: "http://localhost/api/admin/saved-searches/1",
    nextUrl: { pathname: "/api/admin/saved-searches/1" },
    json: vi.fn().mockResolvedValue({ name: "test-name" }),
  } as unknown as NextRequest;
}

describe("saved search id API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.getSavedSearch.mockResolvedValue({ id: "1", name: "test" });
    mockService.updateSavedSearch.mockResolvedValue({ id: "1", name: "updated" });
    mockService.deleteSavedSearch.mockResolvedValue(undefined);
  });

  it("calls service on GET", async () => {
    const res = await GET(createReq("GET"), { params: { id: "1" } } as any);
    expect(res.status).toBe(200);
    expect(mockService.getSavedSearch).toHaveBeenCalledWith("1", "u1");
  });

  it("calls service on PATCH", async () => {
    const res = await PATCH(createReq("PATCH"), { params: { id: "1" } } as any);
    expect(res.status).toBe(200);
    expect(mockService.updateSavedSearch).toHaveBeenCalled();
  });

  it("calls service on DELETE", async () => {
    const res = await DELETE(createReq("DELETE"), {
      params: { id: "1" },
    } as any);
    expect(res.status).toBe(204);
    expect(mockService.deleteSavedSearch).toHaveBeenCalledWith("1", "u1");
  });
});