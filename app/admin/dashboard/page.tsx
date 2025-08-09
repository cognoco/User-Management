"use client";
import { AdminDashboard } from '@/ui/styled/admin/AdminDashboard';
import { Button } from '@/ui/primitives/button';
import Link from 'next/link';

// Note: metadata export is not allowed in client components

export default function AdminDashboardPage(): JSX.Element {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            View and manage your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/team">
              Manage Team
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/settings">
              Organization Settings
            </Link>
          </Button>
        </div>
      </div>
      
      <AdminDashboard />
    </div>
  );
} 