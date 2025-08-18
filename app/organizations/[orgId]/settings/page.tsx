'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { OrganizationSettings, OrganizationData } from '@/components/organization/OrganizationSettings';
import { api } from '@/lib/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Building2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/ui/primitives/alert';

export default function OrganizationSettingsPage(): React.ReactElement {
  const params = useParams();
  const organizationId = params.orgId as string;
  
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganization();
  }, [organizationId]);

  const fetchOrganization = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await api.get(`/api/organizations/${organizationId}`);
      setOrganization(response.data);
    } catch (err) {
      setError('Failed to load organization data');
      console.error('Error fetching organization:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: Partial<OrganizationData>): Promise<void> => {
    try {
      const response = await api.put(`/api/organizations/${organizationId}`, updates);
      setOrganization(response.data);
    } catch (error) {
      console.error('Failed to save organization settings:', error);
      throw new Error('Failed to save organization settings');
    }
  };

  const handleDelete = async (): Promise<void> => {
    try {
      await api.delete(`/api/organizations/${organizationId}`);
      // Redirect to dashboard or organizations list
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Failed to delete organization:', error);
      throw new Error('Failed to delete organization');
    }
  };

  const handleExportData = async (): Promise<void> => {
    try {
      const response = await api.get(`/api/organizations/${organizationId}/export`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `organization-${organization?.name || organizationId}-data.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error('Failed to export organization data');
    }
  };

  const handleUploadLogo = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await api.post(`/api/organizations/${organizationId}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      return response.data.logoUrl;
    } catch (error) {
      console.error('Failed to upload logo:', error);
      throw new Error('Failed to upload logo');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading organization settings...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error || 'Organization not found'}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <OrganizationSettings
          organization={organization}
          onSave={handleSave}
          onDelete={handleDelete}
          onExportData={handleExportData}
          onUploadLogo={handleUploadLogo}
          canDelete={true}
          canEditBilling={true}
          isOwner={true}
        />
      </div>
    </div>
  );
}