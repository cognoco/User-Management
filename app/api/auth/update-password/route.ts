import { z } from "zod";
import { withValidatedServices } from "@/lib/api/with-services";
import { logUserAction } from "@/lib/audit/auditLogger";
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES,
} from "@/lib/api/common";

// Zod schema for password update
const UpdatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"|,.<>/?]/, {
      message: 'Password must contain at least one special character',
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number" }),
  token: z.string().optional(),
});

/**
 * POST handler for password update endpoint
 */
export const POST = withValidatedServices({
  schema: UpdatePasswordSchema,
  requiredServices: ['auth'],
  requireAuth: false, // Password update can be both authenticated and token-based
  handler: async ({ request, data, userId, services }) => {
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    let userIdForLogging: string | null = null;

    try {
      if (data.token) {
        // Token-based password update (password reset flow)
        const result = (await services.auth.updatePasswordWithToken(data.token, data.password)) as any;
        userIdForLogging = result.user?.id || null;
        if (!result.success) {
          throw new ApiError(
            ERROR_CODES.INVALID_REQUEST,
            result.error || 'Failed to update password',
            400
          );
        }
      } else {
        // Authenticated password update (user changing their password)
        if (!userId) {
          await logUserAction({
            action: "PASSWORD_UPDATE_UNAUTHORIZED",
            status: "FAILURE",
            ipAddress,
            userAgent,
            targetResourceType: "auth",
            details: { reason: "No user session found" },
          });
          throw new ApiError(ERROR_CODES.UNAUTHORIZED, "Unauthorized", 401);
        }
        userIdForLogging = userId;
        await services.auth.updatePassword("", data.password);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update password";
      await logUserAction({
        userId: userIdForLogging,
        action: "PASSWORD_UPDATE_FAILURE",
        status: "FAILURE",
        ipAddress,
        userAgent,
        targetResourceType: "auth",
        targetResourceId: userIdForLogging,
        details: { reason: errorMessage },
      });
      throw new ApiError(ERROR_CODES.INVALID_REQUEST, errorMessage, 400);
    }

    await logUserAction({
      userId: userIdForLogging,
      action: "PASSWORD_UPDATE_SUCCESS",
      status: "SUCCESS",
      ipAddress,
      userAgent,
      targetResourceType: "auth",
      targetResourceId: userIdForLogging,
    });

    return createSuccessResponse({ message: "Password updated successfully" });
  }
});
