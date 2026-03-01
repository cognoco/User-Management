import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../route';

describe('Domain Verification API Routes', () => {
  const mockOrgId = 'test-org-123';
  beforeEach(() => {
    vi.resetModules();
  });

  describe('GET /domains', () => {
    it('returns empty domains list for new organization', async () => {
      const request = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/domains`)
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        domains: [],
        verificationMethods: ['dns', 'file'],
      });
    });

    it('returns list of configured domains', async () => {
      // First add a domain
      const addRequest = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/domains`),
        {
          method: 'POST',
          body: JSON.stringify({ domain: 'example.com' }),
        }
      );
      await POST(addRequest);

      // Then get the list
      const request = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/domains`)
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.domains).toHaveLength(1);
      expect(data.domains[0]).toEqual({
        domain: 'example.com',
        status: 'pending',
        verificationMethod: null,
        verificationDetails: null,
      });
    });
  });

  describe('POST /domains', () => {
    it('adds a new domain successfully', async () => {
      const request = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/domains`),
        {
          method: 'POST',
          body: JSON.stringify({ domain: 'test.com' }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        domain: 'test.com',
        status: 'pending',
        verificationMethod: null,
        verificationDetails: null,
      });
    });

    it('validates domain format', async () => {
      const request = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/domains`),
        {
          method: 'POST',
          body: JSON.stringify({ domain: 'invalid-domain' }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid domain format');
    });

    it('prevents duplicate domains', async () => {
      // Add domain first time
      const firstRequest = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/domains`),
        {
          method: 'POST',
          body: JSON.stringify({ domain: 'duplicate.com' }),
        }
      );
      await POST(firstRequest);

      // Try to add same domain again
      const secondRequest = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/domains`),
        {
          method: 'POST',
          body: JSON.stringify({ domain: 'duplicate.com' }),
        }
      );

      const response = await POST(secondRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error', 'Domain already exists');
    });
  });

  describe('DELETE /domains', () => {
    it('removes a domain successfully', async () => {
      // First add a domain
      const addRequest = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/domains`),
        {
          method: 'POST',
          body: JSON.stringify({ domain: 'todelete.com' }),
        }
      );
      await POST(addRequest);

      // Then delete it
      const deleteRequest = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/domains`),
        {
          method: 'DELETE',
          body: JSON.stringify({ domain: 'todelete.com' }),
        }
      );

      const response = await DELETE(deleteRequest);
      expect(response.status).toBe(200);

      // Verify domain was removed
      const getRequest = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/domains`)
      );
      const getResponse = await GET(getRequest);
      const data = await getResponse.json();

      expect(data.domains).toHaveLength(0);
    });

    it('returns 404 for non-existent domain', async () => {
      const request = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/domains`),
        {
          method: 'DELETE',
          body: JSON.stringify({ domain: 'nonexistent.com' }),
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Domain not found');
    });
  });
}); 