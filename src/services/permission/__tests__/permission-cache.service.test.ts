import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PermissionCacheService } from '../permission-cache.service';

vi.mock('@upstash/redis', () => ({ Redis: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() })) }));

describe('PermissionCacheService', () => {
  let service: PermissionCacheService;
  beforeEach(() => {
    service = new PermissionCacheService();
  });

  it('tracks hit and miss metrics', async () => {
    await service.userRoles.set('u1', []);
    await service.userRoles.get('u1');
    await service.userRoles.get('u2');
    const metrics = service.getMetrics();
    expect(metrics.userRoles.hits).toBe(1);
    expect(metrics.userRoles.misses).toBe(1);
  });
});
