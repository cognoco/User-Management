'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SSOConfiguration, SSOProvider } from '@/components/organization/SSOConfiguration';
import { api } from '@/lib/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Key, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/ui/primitives/alert';

export default function OrganizationSSOPage(): React.ReactElement {
  const params = useParams();
  const organizationId = params.orgId as string;
  
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [verifiedDomains, setVerifiedDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSSOData();
  }, [organizationId]);

  const fetchSSOData = async (): Promise<void> => {
    try {
      setLoading(true);
      const [ssoResponse, domainsResponse] = await Promise.all([
        api.get(`/api/organizations/${organizationId}/sso`),
        api.get(`/api/organizations/${organizationId}/domains`)
      ]);
      
      setProviders(ssoResponse.data.providers || []);
      setVerifiedDomains(
        domainsResponse.data.domains
          ?.filter((d: any) => d.status === 'verified')
          ?.map((d: any) => d.domain) || []
      );
    } catch (err) {
      setError('Failed to load SSO configuration');
      console.error('Error fetching SSO data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProvider = async (provider: SSOProvider): Promise<void> => {
    try {
      let response;
      if (provider.id && providers.find(p => p.id === provider.id)) {
        // Update existing provider
        response = await api.put(`/api/organizations/${organizationId}/sso/${provider.id}`, provider);
      } else {
        // Create new provider
        response = await api.post(`/api/organizations/${organizationId}/sso`, provider);
      }
      
      const savedProvider = response.data.provider;
      
      if (provider.id && providers.find(p => p.id === provider.id)) {
        setProviders(providers.map(p => p.id === provider.id ? savedProvider : p));
      } else {
        setProviders([...providers, savedProvider]);
      }
    } catch (error) {
      console.error('Failed to save SSO provider:', error);
      throw new Error('Failed to save SSO provider');
    }
  };

  const handleDeleteProvider = async (providerId: string): Promise<void> => {
    try {
      await api.delete(`/api/organizations/${organizationId}/sso/${providerId}`);
      setProviders(providers.filter(p => p.id !== providerId));
    } catch (error) {
      console.error('Failed to delete SSO provider:', error);
      throw new Error('Failed to delete SSO provider');
    }
  };

  const handleTestConnection = async (providerId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post(`/api/organizations/${organizationId}/sso/${providerId}/test`);
      return { success: response.data.success, error: response.data.error };
    } catch (error) {
      console.error('Failed to test connection:', error);
      return { success: false, error: 'Connection test failed' };
    }
  };

  const handleDownloadMetadata = async (): Promise<string> => {
    try {
      const response = await api.get(`/api/organizations/${organizationId}/sso/metadata`);
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sp-metadata-${organizationId}.xml`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return url;
    } catch (error) {
      console.error('Failed to download metadata:', error);
      throw new Error('Failed to download metadata');
    }
  };

  const handleUploadMetadata = async (file: File): Promise<void> => {
    try {
      const formData = new FormData();
      formData.append('metadata', file);
      
      await api.post(`/api/organizations/${organizationId}/sso/metadata`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (error) {
      console.error('Failed to upload metadata:', error);
      throw new Error('Failed to upload metadata');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Single Sign-On (SSO)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading SSO configuration...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <SSOConfiguration
          organizationId={organizationId}
          providers={providers}
          verifiedDomains={verifiedDomains}
          onSaveProvider={handleSaveProvider}
          onDeleteProvider={handleDeleteProvider}
          onTestConnection={handleTestConnection}
          onDownloadMetadata={handleDownloadMetadata}
          onUploadMetadata={handleUploadMetadata}
          allowMultipleProviders={false}
          maxProviders={3}
        />
      </div>
    </div>
  );
}