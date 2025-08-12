import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from '../route';

const mockService = {
  getAncestorRoles: vi.fn(),
  getDescendantRoles: vi.fn(),
  setParentRole: vi.fn(),
};


beforeEach(() => {
  vi.resetAllMocks();
});

describe('role hierarchy API', () => {
  it('GET returns hierarchy info', async () => {
    mockService.getAncestorRoles.mockResolvedValue([{ id: 'a' }]);
    mockService.getDescendantRoles.mockResolvedValue([]);
    const res = await GET({} as any, { params: { roleId: '1' } } as any);
    expect(res.status).toBe(200);
    expect(mockService.getAncestorRoles).toHaveBeenCalledWith('1');
  });

  it('PUT sets parent role', async () => {
    const req = new Request('http://test', { method: 'PUT', body: JSON.stringify({ parentRoleId: 'p' }) });
    (req as any).json = async () => ({ parentRoleId: 'p' });
    mockService.setParentRole.mockResolvedValue(undefined);
    const res = await PUT(req as any, { params: { roleId: '1' } } as any);
    expect(res.status).toBe(200);
    expect(mockService.setParentRole).toHaveBeenCalledWith('1', 'p');
  });
});
