import { NextRequest } from 'next/server';
import { describe, it, expect } from 'vitest';
import { GET, POST } from '../route';

const mockRequest = (body: any) => new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify(body) });

describe('/api/subscription', () => {
  it('GET returns subscriptions array', async () => {
    const res = await GET();
    const json = await res.json();
    expect(Array.isArray(json.subscriptions)).toBe(true);
  });

  it('POST returns success for valid input', async () => {
    const req = mockRequest({ plan: 'pro' });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.subscription.plan).toBe('pro');
  });

  it('POST returns 400 for invalid input', async () => {
    const req = mockRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
}); 