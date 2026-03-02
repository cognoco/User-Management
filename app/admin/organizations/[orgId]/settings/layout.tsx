import React, { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/ui/primitives/button';
import { ShieldCheck, Users, Lock, Key, Bell, Settings, HomeIcon } from 'lucide-react';

interface SettingsLayoutProps {
  children: ReactNode;
  params: Promise<{
    orgId: string;
  }>;
}

export default async function SettingsLayout({ children, params }: SettingsLayoutProps): Promise<JSX.Element> {
  const { orgId } = await params;

  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 space-y-2">
          <div className="font-medium mb-4">Organization Settings</div>
          
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href={`/admin/organizations/${orgId}/settings`}>
              <Settings className="mr-2 h-5 w-5" />
              General
            </Link>
          </Button>
          
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href={`/admin/organizations/${orgId}/settings/users`}>
              <Users className="mr-2 h-5 w-5" />
              Users
            </Link>
          </Button>
          
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href={`/admin/organizations/${orgId}/settings/roles`}>
              <ShieldCheck className="mr-2 h-5 w-5" />
              Roles
            </Link>
          </Button>
          
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href={`/admin/organizations/${orgId}/settings/sso`}>
              <Lock className="mr-2 h-5 w-5" />
              Single Sign-On
            </Link>
          </Button>
          
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href={`/admin/organizations/${orgId}/settings/api-keys`}>
              <Key className="mr-2 h-5 w-5" />
              API Keys
            </Link>
          </Button>
          
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href={`/admin/organizations/${orgId}/settings/notifications`}>
              <Bell className="mr-2 h-5 w-5" />
              Notifications
            </Link>
          </Button>
          
          <div className="pt-4">
            <Button asChild variant="outline" size="sm" className="w-full justify-start">
              <Link href="/admin/dashboard">
                <HomeIcon className="mr-2 h-4 w-4" />
                Back to Admin
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
} 