import React from 'react';
import { notFound } from 'next/navigation';
import OrganizationSSO from '@/ui/styled/auth/OrganizationSSO';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';

interface SSOSettingsPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

export default async function SSOSettingsPage({ params }: SSOSettingsPageProps): Promise<JSX.Element> {
  const { orgId } = await params;

  if (!orgId) {
    return notFound();
  }

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Organization SSO Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Single Sign-On Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationSSO orgId={orgId} />
        </CardContent>
      </Card>
    </div>
  );
} 