import { z } from "zod";
import { createApiHandlerWithServices } from "@/lib/api/route-helpers-v2";
import { configureUserManagement } from "@/lib/config/configure-user-management";
import { logUserAction } from "@/lib/audit/auditLogger";
import { createSuccessResponse } from "@/lib/api/common";

// Configure services at module level using dependency injection
const services = configureUserManagement();

// Zod schema for password reset request
const ResetRequestSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

/**
 * POST handler for password reset endpoint
 */
export const POST = createApiHandlerWithServices(
  ResetRequestSchema,
  async (request, _authContext, data, injectedServices) => {
    const ipAddress = request.ip || request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const { email } = data;

    // Call auth service to initiate password reset
    const resetResult = await injectedServices.auth.resetPassword(email);

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

    if (\!resetResult.success) {
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
  services,
  { 
    requireAuth: false, // Password reset doesn't require auth
    rateLimit: { windowMs: 15 * 60 * 1000, max: 5 } // Strict rate limiting for password reset
  }
);
EOF < /dev/null