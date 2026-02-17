import { NextRequest } from 'next/server';
import { describe, it, expect } from 'vitest';
import { POST } from '../route';

const mockRequest = (body: any) => new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify(body) });

describe('POST /api/company/validate', () => {
  it('returns valid: true for a valid company name', async () => {
    const req = mockRequest({ companyName: 'Acme Inc' });
    const res = await POST(req);
    const json = await res.json();
    expect(json.valid).toBe(true);
  });

  it('returns valid: false for an invalid company name', async () => {
    const req = mockRequest({ companyName: 'Acme' });
    const res = await POST(req);
    const json = await res.json();
    expect(json.valid).toBe(false);
  });

  it('returns 400 for invalid input', async () => {
    const req = mockRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
}); 