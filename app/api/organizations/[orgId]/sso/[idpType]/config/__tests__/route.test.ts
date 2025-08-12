import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from '../route';
import { getApiSsoService } from '@/services/sso/factory';



describe('IDP Configuration API Routes', () => {
  const mockOrgId = 'test-org-123';
  const store: any[] = [];
  const mockService = {
    getProviders: vi.fn(async (orgId: string) => store.filter(p => p.organizationId === orgId)),
    upsertProvider: vi.fn(async (payload: any) => {
      let provider = store.find(p => p.organizationId === payload.organizationId && p.providerType === payload.providerType);
      if (!provider) {
        provider = { id: `${store.length + 1}`, ...payload, isActive: true };
        store.push(provider);
      } else {
        provider.config = payload.config;
      }
      return { success: true, provider };
    }),
  };

  beforeEach(() => {
    vi.resetModules();
    store.length = 0;
    (getApiSsoService as unknown as vi.Mock).mockReturnValue(mockService);
  });

  describe('SAML Configuration', () => {
    const mockParams = { params: { orgId: mockOrgId, idpType: 'saml' } };
    const validSamlConfig = {
      entityId: 'https://test-idp.com/metadata',
      ssoUrl: 'https://test-idp.com/sso',
      x509Certificate: '-----BEGIN CERTIFICATE-----\nMIIC...test...cert\n-----END CERTIFICATE-----',
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    };

    it('returns empty config for new organization', async () => {
      const request = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/saml/config`)
      );

      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        entityId: '',
        ssoUrl: '',
        x509Certificate: '',
        nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      });
    });

    it('updates SAML configuration successfully', async () => {
      const request = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/saml/config`),
        {
          method: 'PUT',
          body: JSON.stringify(validSamlConfig),
        }
      );

      const response = await PUT(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(validSamlConfig);
      expect(mockService.upsertProvider).toHaveBeenCalled();

      // Verify config was stored
      const getRequest = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/saml/config`)
      );
      const getResponse = await GET(getRequest, mockParams);
      const getdata = await getResponse.json();

      expect(getdata).toEqual(validSamlConfig);
    });

    it('validates SAML configuration', async () => {
      const invalidConfig = {
        entityId: 'not-a-url',
        ssoUrl: 'also-not-a-url',
        x509Certificate: 'invalid-cert',
        nameIdFormat: 'invalid-format',
      };

      const request = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/saml/config`),
        {
          method: 'PUT',
          body: JSON.stringify(invalidConfig),
        }
      );

      const response = await PUT(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid configuration');
    });
  });

  describe('OIDC Configuration', () => {
    const mockParams = { params: { orgId: mockOrgId, idpType: 'oidc' } };
    const validOidcConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      issuer: 'https://test-idp.com',
      authorizationEndpoint: 'https://test-idp.com/auth',
      tokenEndpoint: 'https://test-idp.com/token',
      userInfoEndpoint: 'https://test-idp.com/userinfo',
      scope: 'openid email profile',
    };

    it('returns empty config for new organization', async () => {
      const request = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/oidc/config`)
      );

      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        clientId: '',
        clientSecret: '',
        issuer: '',
        authorizationEndpoint: '',
        tokenEndpoint: '',
        userInfoEndpoint: '',
        scope: 'openid email profile',
      });
    });

    it('updates OIDC configuration successfully', async () => {
      const request = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/oidc/config`),
        {
          method: 'PUT',
          body: JSON.stringify(validOidcConfig),
        }
      );

      const response = await PUT(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(validOidcConfig);
      expect(mockService.upsertProvider).toHaveBeenCalled();

      // Verify config was stored
      const getRequest = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/oidc/config`)
      );
      const getResponse = await GET(getRequest, mockParams);
      const getdata = await getResponse.json();

      expect(getdata).toEqual(validOidcConfig);
    });

    it('validates OIDC configuration', async () => {
      const invalidConfig = {
        clientId: '',
        clientSecret: '',
        issuer: 'not-a-url',
        authorizationEndpoint: 'not-a-url',
        tokenEndpoint: 'not-a-url',
        userInfoEndpoint: 'not-a-url',
        scope: '',
      };

      const request = new NextRequest(
        new URL(`http://localhost/api/organizations/${mockOrgId}/sso/oidc/config`),
        {
          method: 'PUT',
          body: JSON.stringify(invalidConfig),
        }
      );

      const response = await PUT(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid configuration');
    });
  });

  it('returns 404 for invalid IDP type', async () => {
    const mockParams = { params: { orgId: mockOrgId, idpType: 'invalid' } };
    const request = new NextRequest(
      new URL(`http://localhost/api/organizations/${mockOrgId}/sso/invalid/config`)
    );

    const response = await GET(request, mockParams);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty('error', 'Invalid IDP type');
  });
}); 