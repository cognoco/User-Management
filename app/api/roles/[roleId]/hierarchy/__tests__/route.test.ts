import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from '../route';

const mockService = {
  getAncestorRoles: vi.fn(),
  getDescendantRoles: vi.fn(),
  setParentRole: vi.fn(),
};
vi.mock('@/services/role/factory', () => ({
  getApiRoleService: () => mockService,
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe('role hierarchy API', () => {
  it('GET returns hierarchy info', async () => {
    mockService.getAncestorRoles.mockResolvedValue([{ id: 'a' }]);
    mockService.getDescendantRoles.mockResolvedValue([]);
    const req = new NextRequest('http://test/api/roles/1/hierarchy');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockService.getAncestorRoles).toHaveBeenCalledWith('1');
  });

  it('PUT sets parent role', async () => {
    const req = new NextRequest('http://test/api/roles/1/hierarchy', { method: 'PUT', body: JSON.stringify({ parentRoleId: 'p' }) });
    mockService.setParentRole.mockResolvedValue(undefined);
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(mockService.setParentRole).toHaveBeenCalledWith('1', 'p');
  });
});
