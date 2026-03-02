import { Metadata } from "next";
import { redirect } from "next/navigation";
import RolesManagementPageClient from "./ClientPage";
import { getSupabaseServerClient } from "@/lib/auth";
import type { User as SupabaseUser } from "@supabase/auth-js";
import { hasPermission } from "@/lib/auth/hasPermission";
import { PermissionValues } from "@/core/permission/models";

export const metadata: Metadata = {
  title: "Role Management",
  description: "Manage user roles and permissions",
};

export default async function RolesManagementPage(): Promise<JSX.Element> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user: SupabaseUser | null = data.user;

  if (error || !user) {
    redirect("/auth/login");
  }

  const canManageRoles = await hasPermission(
    user.id,
    PermissionValues.MANAGE_ROLES,
  );

  if (!canManageRoles) {
    redirect("/dashboard/overview");
  }

  return <RolesManagementPageClient />;
}
