import { z } from "zod";
import { withValidatedServices } from '@/lib/api/with-services';
import { logUserAction } from "@/lib/audit/auditLogger";
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES,
} from "@/lib/api/common";

// Zod schema for account deletion request
const DeleteAccountSchema = z.object({
  password: z
    .string()
    .min(1, { message: "Password confirmation is required." }),
});

// DELETE handler for account deletion
export const DELETE = withValidatedServices({
  schema: DeleteAccountSchema,
  requiredServices: ['auth'],
  requireAuth: true,
  rateLimit: { windowMs: 15 * 60 * 1000, max: 3 },
  handler: async ({ services, request, data, userId, params }) => {
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Get user info from auth context (userId is already available from withValidatedServices)
    const user = await services.auth.getUserAccount(userId);
    const userEmail = user.email;

    if (!userEmail) {
      throw new ApiError(
        ERROR_CODES.INVALID_REQUEST,
        "User email not found, cannot verify password.",
        400,
      );
    }

    const { password } = data;

    console.log("Account deletion attempt initiated for user:", userId);

    // Log the account deletion attempt
    await logUserAction({
      userId,
      action: "ACCOUNT_DELETION_INITIATED",
      status: "INITIATED",
      ipAddress,
      userAgent,
      targetResourceType: "account",
      targetResourceId: userId,
    });

    try {
      // Delete account using the AuthService
      const result = await services.auth.deleteAccount({
        userId,
        password,
      });

      // Handle the result
      if (!result.success) {
        console.error("Account deletion failed for user:", userId, result.error);

        // Log the failed deletion
        await logUserAction({
          userId,
          action: "ACCOUNT_DELETION_FAILED",
          status: "FAILURE",
          ipAddress,
          userAgent,
          targetResourceType: "account",
          targetResourceId: userId,
          details: { error: result.error },
        });

        // Return appropriate error based on the error type
        if (result.error === "INVALID_PASSWORD") {
          throw new ApiError(
            ERROR_CODES.UNAUTHORIZED,
            "Incorrect password provided.",
            401,
          );
        } else {
          throw new ApiError(
            ERROR_CODES.INTERNAL_ERROR,
            result.error || "Account deletion failed.",
            500,
          );
        }
      }

      // Log the successful deletion
      await logUserAction({
        action: "ACCOUNT_DELETION_COMPLETED",
        status: "SUCCESS",
        ipAddress,
        userAgent,
        targetResourceType: "account",
        targetResourceId: userId,
      });

      console.log("Account deletion successful for user:", userId);

      // Return success
      return createSuccessResponse({ message: "Account successfully deleted." });
    } catch (error) {
      // Handle Unexpected Errors
      console.error("Account deletion process error for user:", userId, error);
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";

      // Log the error
      await logUserAction({
        userId,
        action: "ACCOUNT_DELETION_ERROR",
        status: "FAILURE",
        ipAddress,
        userAgent,
        targetResourceType: "account",
        targetResourceId: userId,
        details: { error: message },
      });

      throw new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Account deletion failed due to an unexpected error.",
        500,
      );
    }
  }
});

// GET handler to fetch account info
export const GET = withValidatedServices({
  schema: z.object({}), // No body parameters for GET
  requiredServices: ['auth'],
  requireAuth: true,
  rateLimit: { windowMs: 15 * 60 * 1000, max: 20 },
  handler: async ({ services, request, data, userId, params }) => {
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    try {
      // Get user account details
      const accountDetails = await services.auth.getUserAccount(userId);

      // Log the account info request
      await logUserAction({
        userId,
        action: "ACCOUNT_INFO_REQUESTED",
        status: "SUCCESS",
        ipAddress,
        userAgent,
        targetResourceType: "account",
        targetResourceId: userId,
      });

      return createSuccessResponse(accountDetails);
    } catch (error) {
      console.error("Error fetching account info:", error);
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";

      // Log the error
      await logUserAction({
        userId,
        action: "ACCOUNT_INFO_ERROR",
        status: "FAILURE",
        ipAddress,
        userAgent,
        targetResourceType: "account",
        targetResourceId: userId,
        details: { error: message },
      });

      throw new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch account information",
        500,
      );
    }
  }
});
