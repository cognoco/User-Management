import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/auth";
import type { User as SupabaseUser } from "@supabase/auth-js";
import { hasPermission } from "@/lib/auth/hasPermission";
import { PermissionValues } from "@/core/permission/models";
import AdminUsersPageClient from "./ClientPage";

export const metadata: Metadata = {
  title: "User Management",
  description: "Manage application users",
};

export default async function AdminUsersPage(): Promise<JSX.Element> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user: SupabaseUser | null = data.user;

  if (error || !user) {
    redirect("/auth/login");
  }

  const canManageUsers = await hasPermission(
    user.id,
    PermissionValues.EDIT_USER_PROFILES,
  );

  if (!canManageUsers) {
    redirect("/dashboard/overview");
  }

  return <AdminUsersPageClient />;
}
