import { describe, it, expect, vi } from 'vitest';
import { GET } from '../route';
import { getHealthService } from '@/services/health';
import { NextRequest } from 'next/server';

vi.mock('@/services/health', () => ({
  getHealthService: vi.fn()
}));

describe('/api/health', () => {
  it('should return healthy status', async () => {
    const mockHealthService = {
      checkSystemHealth: vi.fn().mockResolvedValue({ status: 'ok' })
    } as any;
    (getHealthService as unknown as vi.Mock).mockReturnValue(mockHealthService);

    const req = new NextRequest('http://localhost/api/health');
    const response = await GET(req);
    const data = await response.json();

    expect(data.status).toBe('healthy');
    expect(data.services).toEqual({ status: 'ok' });
  });
});
