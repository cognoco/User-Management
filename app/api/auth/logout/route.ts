import { NextResponse } from "next/server";
import { withValidatedServices, schemas } from "@/lib/api/with-services";
import { createSuccessResponse } from "@/lib/api/common";

/**
 * POST handler for logout endpoint
 */
export const POST = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['auth'],
  requireAuth: false, // Logout can work with or without auth
  handler: async ({ request, services }) => {
    // Extract request context for the service
    const context = {
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    };

    // Call auth service with context - all business logic including audit logging is now in the service
    await services.auth.logout(context);
    
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");

    console.log("Logout successful");
    const headers = {
      "Set-Cookie": "auth_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
    };

    if (callbackUrl) {
      const res = NextResponse.redirect(callbackUrl);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    return createSuccessResponse(
      { message: "Successfully logged out" },
      200,
      undefined,
      headers
    );
  }
});
