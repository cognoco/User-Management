import { z } from "zod";
import { createApiHandler } from "@/lib/api/route-helpers";
import { logUserAction } from "@/lib/audit/auditLogger";
import { createSuccessResponse } from "@/lib/api/common";

// Zod schema for password reset request
const ResetRequestSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

/**
 * POST handler for password reset endpoint
 */
export const POST = createApiHandler(
  ResetRequestSchema,
  async (request, _authContext, data, services) => {
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const { email } = data;

    // Call auth service to initiate password reset
    const resetResult = await services.auth.resetPassword(email);

    // Log the password reset attempt
    await logUserAction({
      action: "PASSWORD_RESET_REQUEST",
      status: resetResult.success ? "INITIATED" : "FAILURE",
      ipAddress,
      userAgent,
      targetResourceType: "auth",
      targetResourceId: email,
      details: { error: resetResult.error || null },
    });

    if (!resetResult.success) {
      console.error(
        "Password reset error (will still return generic success):",
        resetResult.error,
      );
    }

    // Always return success message for security (don't reveal if email exists)
    return createSuccessResponse({
      message:
        "If an account exists with this email, you will receive password reset instructions.",
    });
  },
  { 
    requireAuth: false, // Password reset doesn't require auth
    rateLimit: { windowMs: 15 * 60 * 1000, max: 5 } // Strict rate limiting for password reset
  }
);
