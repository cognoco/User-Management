'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DomainVerification, Domain } from '@/components/organization/DomainVerification';
import { api } from '@/lib/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Shield, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/ui/primitives/alert';

export default function OrganizationDomainsPage(): React.ReactElement {
  const params = useParams();
  const organizationId = params.orgId as string;
  
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDomains();
  }, [organizationId]);

  const fetchDomains = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await api.get(`/api/organizations/${organizationId}/domains`);
      setDomains(response.data.domains || []);
    } catch (err) {
      setError('Failed to load domains');
      console.error('Error fetching domains:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (domain: string, method: Domain['verificationMethod']): Promise<Domain> => {
    try {
      const response = await api.post(`/api/organizations/${organizationId}/domains`, {
        domain,
        verificationMethod: method
      });
      
      const newDomain = response.data.domain;
      setDomains([...domains, newDomain]);
      return newDomain;
    } catch (error) {
      console.error('Failed to add domain:', error);
      throw new Error('Failed to add domain');
    }
  };

  const handleVerifyDomain = async (domainId: string): Promise<{ verified: boolean; error?: string }> => {
    try {
      const response = await api.post(`/api/organizations/${organizationId}/domains/${domainId}/verify`);
      
      // Update the domain in the list
      setDomains(domains.map(d => 
        d.id === domainId 
          ? { ...d, status: response.data.verified ? 'verified' : 'failed', verifiedAt: response.data.verified ? new Date() : undefined }
          : d
      ));
      
      return { verified: response.data.verified, error: response.data.error };
    } catch (error) {
      console.error('Failed to verify domain:', error);
      return { verified: false, error: 'Verification failed' };
    }
  };

  const handleRemoveDomain = async (domainId: string): Promise<void> => {
    try {
      await api.delete(`/api/organizations/${organizationId}/domains/${domainId}`);
      setDomains(domains.filter(d => d.id !== domainId));
    } catch (error) {
      console.error('Failed to remove domain:', error);
      throw new Error('Failed to remove domain');
    }
  };

  const handleSetPrimaryDomain = async (domainId: string): Promise<void> => {
    try {
      await api.put(`/api/organizations/${organizationId}/domains/${domainId}/primary`);
      setDomains(domains.map(d => ({ ...d, isPrimary: d.id === domainId })));
    } catch (error) {
      console.error('Failed to set primary domain:', error);
      throw new Error('Failed to set primary domain');
    }
  };

  const handleRefreshStatus = async (domainId: string): Promise<Domain> => {
    try {
      const response = await api.get(`/api/organizations/${organizationId}/domains/${domainId}`);
      const updatedDomain = response.data.domain;
      setDomains(domains.map(d => d.id === domainId ? updatedDomain : d));
      return updatedDomain;
    } catch (error) {
      console.error('Failed to refresh domain status:', error);
      throw new Error('Failed to refresh domain status');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Domain Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading domains...</span>
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
        <DomainVerification
          organizationId={organizationId}
          domains={domains}
          onAddDomain={handleAddDomain}
          onVerifyDomain={handleVerifyDomain}
          onRemoveDomain={handleRemoveDomain}
          onSetPrimaryDomain={handleSetPrimaryDomain}
          onRefreshStatus={handleRefreshStatus}
          maxDomains={5}
          allowMultipleDomains={true}
        />
      </div>
    </div>
  );
}