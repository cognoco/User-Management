import { NextRequest, NextResponse } from "next/server";
import { getApiCompanyService } from "@/services/company/factory";
import type { AuthContext } from '@/core/config/interfaces';
import {
  createMiddlewareChain,
  errorHandlingMiddleware,
  routeAuthMiddleware,
  rateLimitMiddleware,
  validationMiddleware,
} from "@/middleware/createMiddlewareChain";
import { withSecurity } from "@/middleware/with-security";
import { z } from "zod";

// Validation schema for adding a new domain
const domainSchema = z.object({
  domain: z
    .string()
    .min(1, "Domain is required")
    .regex(
      /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/,
      "Enter a valid domain (e.g. example.com)",
    ),
  companyId: z.string().uuid("Invalid company ID format"),
});

type DomainRequest = z.infer<typeof domainSchema>;

const baseMiddleware = createMiddlewareChain([
  rateLimitMiddleware(),
  errorHandlingMiddleware(),
  routeAuthMiddleware(),
]);

const postMiddleware = createMiddlewareChain([
  rateLimitMiddleware(),
  errorHandlingMiddleware(),
  routeAuthMiddleware(),
  validationMiddleware(domainSchema),
]);

async function handleGet(_request: NextRequest, auth: AuthContext) {
  try {
    const companyService = getApiCompanyService();
    const companyProfile = await companyService.getProfileByUserId(auth.userId!);

    if (!companyProfile) {
      return NextResponse.json(
        { error: "Company profile not found." },
        { status: 404 },
      );
    }

    const domains = await companyService.listDomains(companyProfile.id);

    return NextResponse.json({ domains });
  } catch (error) {
    console.error("Unexpected error in GET /api/company/domains:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 },
    );
  }
}

async function handlePost(
  _request: NextRequest,
  auth: AuthContext,
  data: DomainRequest,
) {
  try {
    const { domain, companyId } = data;

    const companyService = getApiCompanyService();
    const companyProfile = await companyService.getProfileByUserId(auth.userId!);

    if (!companyProfile || companyProfile.id !== companyId) {
      return NextResponse.json(
        { error: "You do not have permission to add domains to this company." },
        { status: 403 },
      );
    }

    const existingDomains = await companyService.listDomains(companyId);
    if (existingDomains.find((d) => d.domain === domain)) {
      return NextResponse.json(
        { error: "This domain already exists for your company." },
        { status: 400 },
      );
    }

    const isPrimary = existingDomains.length === 0;
    const newDomain = await companyService.createDomain(
      companyId,
      domain,
      isPrimary,
    );

    return NextResponse.json(newDomain);
  } catch (error) {
    console.error("Unexpected error in POST /api/company/domains:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 },
    );
  }
}

export const GET = withSecurity((req: NextRequest) =>
  baseMiddleware((r, auth) => handleGet(r, auth))(req)
);

export const POST = withSecurity((req: NextRequest) =>
  postMiddleware((r, auth, data) => handlePost(r, auth, data))(req)
);
