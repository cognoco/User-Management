import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SettingsPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

export default async function SettingsPage({ params }: SettingsPageProps): Promise<JSX.Element> {
  const { orgId } = await params;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Organization Settings</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              View and update your organization&apos;s general information
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div>Update organization name, logo, and contact details</div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/organizations/${orgId}/settings`}>
                Manage <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Users & Roles</CardTitle>
            <CardDescription>
              Manage users and their access permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div>Invite, remove, and assign roles to users</div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/organizations/${orgId}/settings/users`}>
                Manage <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Single Sign-On</CardTitle>
            <CardDescription>
              Configure SSO authentication for your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div>Setup SAML or OIDC providers for secure login</div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/organizations/${orgId}/settings/sso`}>
                Manage <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Manage API access to your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div>Generate and revoke API keys for integrations</div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/organizations/${orgId}/settings/api-keys`}>
                Manage <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure organization-wide notification settings
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div>Set up email and in-app notification preferences</div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/organizations/${orgId}/settings/notifications`}>
                Manage <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 