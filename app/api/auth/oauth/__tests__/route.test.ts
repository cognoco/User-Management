let POST: (req: Request) => Promise<Response>;
// import { cookies } from 'next/headers';
// import { NextResponse } from 'next/server';
import { OAuthProvider } from "@/types/oauth";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { getServiceContainer } from '@/lib/config/service-container';

// --- Mocks ---

// Mock next/headers cookies
const mockCookies = new Map<string, any>();
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (key: string) => mockCookies.get(key),
    set: (
      key: string | { name: string; [key: string]: any },
      value?: string | object,
    ) => {
      if (typeof key === "string") {
        mockCookies.set(key, {
          name: key,
          value: value,
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 600,
          path: "/",
          ...(typeof value === "object" ? value : {}),
        });
      } else {
        // Handle object syntax for set (key is the object)
        mockCookies.set(key.name, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 600,
          path: "/",
          ...key,
        });
      }
    },
    has: (key: string) => mockCookies.has(key),
    delete: (key: string) => mockCookies.delete(key),
    // Add other methods if your route uses them
  }),
}));


// Mock service container
vi.mock('@/lib/config/service-container', () => ({
  getServiceContainer: vi.fn(),
  resetServiceContainer: vi.fn(),
  configureServices: vi.fn()
}));
const mockService = {
  configureOAuthProvider: vi.fn(),
  getOAuthAuthorizationUrl: vi.fn()
};
const mockServices = { auth: mockService };

// Mock crypto for deterministic state generation
const mockStateValue = "deterministic-state-value-1234567890";

vi.stubGlobal("crypto", {
  getRandomValues: vi.fn((array: Uint8Array) => {
    // Fill with deterministic values for state generation
    // Use Buffer.from with hex encoding for simplicity if the mockStateValue allows
    const stateBytes = Buffer.from(
      mockStateValue
        .substring(0, array.length * 2)
        .padEnd(array.length * 2, "0"),
      "hex",
    );
    stateBytes.copy(array);
    return array;
  }),
  subtle: {},
});

// Mock environment variables (adjust values as needed)
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI =
  "http://localhost:3000/api/auth/oauth/callback";
process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = "test-github-client-id";
process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI =
  "http://localhost:3000/api/auth/oauth/callback";
process.env.NEXT_PUBLIC_APPLE_CLIENT_ID = "test-apple-client-id";
process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI =
  "http://localhost:3000/api/auth/oauth/callback";
// Add mocks for other providers if testing them

// --- Test Suite ---

describe("POST /api/auth/oauth", () => {
  beforeEach(async () => {
    mockCookies.clear();
    vi.clearAllMocks(); // Clear mocks between tests
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "test-google-client-id";
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI =
      "http://localhost:3000/api/auth/oauth/callback";
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = "test-github-client-id";
    process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI =
      "http://localhost:3000/api/auth/oauth/callback";
    process.env.NEXT_PUBLIC_APPLE_CLIENT_ID = "test-apple-client-id";
    process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI =
      "http://localhost:3000/api/auth/oauth/callback";

      (getServiceContainer as Mock).mockReturnValue(mockServices);
    mockService.getOAuthAuthorizationUrl.mockReturnValue(
      'https://example.com/auth'
    );
      POST = (await import("../route")).POST as unknown as (req: Request) => Promise<Response>;
  });

  it("should return authorization URL and state for a valid provider (Google)", async () => {
    const requestBody = JSON.stringify({ provider: OAuthProvider.GOOGLE });
    const request = new Request("http://localhost/api/auth/oauth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ data: { url: "https://example.com/auth", state: expect.any(String) } });
    const returnedState = responseBody.data.state;

    expect(mockService.configureOAuthProvider).toHaveBeenCalled();
    expect(mockService.getOAuthAuthorizationUrl).toHaveBeenCalledWith(
      OAuthProvider.GOOGLE,
      returnedState,
    );

    // Check cookie
    expect(mockCookies.has(`oauth_state_${OAuthProvider.GOOGLE}`)).toBe(true);
    const googleStateCookie = mockCookies.get(
      `oauth_state_${OAuthProvider.GOOGLE}`,
    );
    expect(googleStateCookie.value).toBe(returnedState);

    expect(googleStateCookie.httpOnly).toBe(true);
    expect(googleStateCookie.secure).toBe(true);
    expect(googleStateCookie.sameSite).toBe("lax");
  });


  it("should return 400 if provider is missing", async () => {
    const requestBody = JSON.stringify({}); // Missing provider
    const request = new Request("http://localhost/api/auth/oauth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody).toHaveProperty("error");
    expect(responseBody.error.message).toContain("provider"); // Validation error
    expect(mockService.configureOAuthProvider).not.toHaveBeenCalled();
  });

  it("should return 400 if provider is invalid", async () => {
    const requestBody = JSON.stringify({ provider: "invalid-provider" });
    const request = new Request("http://localhost/api/auth/oauth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody).toHaveProperty("error");
    expect(responseBody.error.message).toContain("provider"); // Validation error
    expect(mockService.configureOAuthProvider).not.toHaveBeenCalled();
  });

  it("should return 400 if provider is not enabled (e.g., Facebook)", async () => {
    const requestBody = JSON.stringify({ provider: OAuthProvider.FACEBOOK });
    const request = new Request("http://localhost/api/auth/oauth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody).toHaveProperty("error");
    expect(responseBody.error.message).toBe("Provider not supported or not enabled.");
    expect(mockService.configureOAuthProvider).not.toHaveBeenCalled();
  });

  it("should handle JSON parsing errors", async () => {
    const requestBody = "invalid json";
    const request = new Request("http://localhost/api/auth/oauth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody).toHaveProperty("error");
    // This should be a validation error for missing provider (even with invalid JSON)
    expect(responseBody.error.message).toMatch(/validation|provider/i); // More flexible check
    expect(mockService.configureOAuthProvider).not.toHaveBeenCalled();
  });

  // Note: Testing disallowed methods (GET, PUT, etc.) is typically handled
  // automatically by Next.js App Router if only POST is exported.
});

afterAll(() => {
  vi.restoreAllMocks();
});
