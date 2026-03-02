import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/auth";
import type { User as SupabaseUser } from "@supabase/auth-js";
import { hasPermission } from "@/lib/auth/hasPermission";
import { PermissionValues } from "@/core/permission/models";
import Link from "next/link";
import { Button } from "@/ui/primitives/button";
import { Users, List, Home, Settings, ShieldCheck } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({
  children,
}: AdminLayoutProps): Promise<JSX.Element> {
  // Create a Supabase client tied to the server session
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user: SupabaseUser | null = data.user;

  if (error || !user) {
    redirect("/auth/login");
  }

  // Check if user has necessary admin permissions
  const [isAdmin, canAccessDashboard] = await Promise.all([
    hasPermission(user.id, PermissionValues.ADMIN_ACCESS),
    hasPermission(user.id, PermissionValues.ACCESS_ADMIN_DASHBOARD),
  ]);

  if (!isAdmin || !canAccessDashboard) {
    redirect("/dashboard/overview");
  }

  return (
    <div className="flex min-h-screen">
      {/* Admin sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-muted/40 border-r">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Admin Portal</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/admin/dashboard">
              <Home className="mr-2 h-5 w-5" />
              Dashboard
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/admin/users">
              <Users className="mr-2 h-5 w-5" />
              Users
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/admin/roles">
              <ShieldCheck className="mr-2 h-5 w-5" />
              Roles
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/admin/audit-logs">
              <List className="mr-2 h-5 w-5" />
              Audit Logs
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/admin/gdpr">
              <List className="mr-2 h-5 w-5" />
              GDPR Compliance
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/admin/settings">
              <Settings className="mr-2 h-5 w-5" />
              Settings
            </Link>
          </Button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
