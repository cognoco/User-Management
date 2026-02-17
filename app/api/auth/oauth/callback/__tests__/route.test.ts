import { NextRequest } from 'next/server';
import { POST } from '../route';
import { OAuthProvider } from '@/types/oauth';
import { describe, it, expect } from 'vitest';

describe('oauth callback route', () => {
  it('returns 400 when state is missing', async () => {
    const req = new NextRequest('http://localhost/api/auth/oauth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: OAuthProvider.GOOGLE, code: 'code' })
    });
    Object.defineProperty(req, 'nextUrl', { value: new URL(req.url) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
