import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';

const addDomainSchema = z.object({
  domain: z.string().min(1),
});

const removeDomainSchema = z.object({
  domain: z.string().min(1),
});

export const GET = createApiHandler(
  emptySchema,
  async (request: NextRequest, _authContext: any, _data: any, services: any) => {
    const orgId = new URL(request.url).pathname.split('/organizations/')[1]?.split('/')[0];
    if (!orgId) {
      return NextResponse.json({ error: 'Missing organization ID' }, { status: 400 });
    }

    const domains = await services.sso.listDomains(orgId);
    return NextResponse.json(domains);
  }
);

export const POST = createApiHandler(
  addDomainSchema,
  async (request: NextRequest, _authContext: any, data: z.infer<typeof addDomainSchema>, services: any) => {
    const orgId = new URL(request.url).pathname.split('/organizations/')[1]?.split('/')[0];
    if (!orgId) {
      return NextResponse.json({ error: 'Missing organization ID' }, { status: 400 });
    }

    const result = await services.sso.addDomain(orgId, data.domain);
    if (!result.success) {
      const status = result.error === 'Domain already exists' ? 400
        : result.error?.includes('not found') ? 404
        : 500;
      return NextResponse.json({ error: result.error || 'Failed to add domain' }, { status });
    }

    return NextResponse.json(result.domain);
  }
);

export const DELETE = createApiHandler(
  removeDomainSchema,
  async (request: NextRequest, _authContext: any, data: z.infer<typeof removeDomainSchema>, services: any) => {
    const orgId = new URL(request.url).pathname.split('/organizations/')[1]?.split('/')[0];
    if (!orgId) {
      return NextResponse.json({ error: 'Missing organization ID' }, { status: 400 });
    }

    const result = await services.sso.removeDomain(orgId, data.domain);
    if (!result.success) {
      const status = result.error?.includes('not found') ? 404 : 500;
      return NextResponse.json({ error: result.error || 'Failed to delete domain' }, { status });
    }

    return NextResponse.json({ success: true });
  }
);
