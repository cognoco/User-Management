import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { createResourceRelationshipService } from '@/services/resource-relationship/factory';

vi.mock('@/middleware/createMiddlewareChain', async () => {
  const actual = await vi.importActual<any>('@/middleware/createMiddlewareChain');
  return {
    ...actual,
    routeAuthMiddleware: vi.fn(() => (handler: any) => handler),
    errorHandlingMiddleware: vi.fn(() => (handler: any) => handler),
    validationMiddleware: vi.fn(() => (handler: any) => (req: any, ctx: any) => handler(req, ctx, {
      parentType: 'project',
      parentId: 'p1',
      childType: 'task',
      childId: 't1',
      relationshipType: 'contains',
    })),
    createMiddlewareChain: (mws: any[]) => (handler: any) => handler,
  };
});

const service = {
  getChildResources: vi.fn(),
  getParentResources: vi.fn(),
  createRelationship: vi.fn(),
};

vi.mock('@/services/resource-relationship/factory', () => ({
  createResourceRelationshipService: vi.fn(() => service),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resource relationships API', () => {
  it('GET fetches children', async () => {
    service.getChildResources.mockResolvedValue([{ id: '1' }]);
    const req = new NextRequest('http://test?parentType=project&parentId=p1');
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.data.relationships).toEqual([{ id: '1' }]);
  });

  it('GET fetches parents', async () => {
    service.getParentResources.mockResolvedValue([{ id: '2' }]);
    const req = new NextRequest('http://test?childType=task&childId=t1');
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.data.relationships).toEqual([{ id: '2' }]);
  });

  it('POST creates relationship', async () => {
    service.createRelationship.mockResolvedValue({ id: '3' });
    const req = new NextRequest('http://test', { method: 'POST' });
    const res = await POST(req as any, { userId: 'u1' } as any, {
      parentType: 'project',
      parentId: 'p1',
      childType: 'task',
      childId: 't1',
      relationshipType: 'contains',
    });
    const body = await res.json();
    expect(body.data.relationship).toEqual({ id: '3' });
  });
});
