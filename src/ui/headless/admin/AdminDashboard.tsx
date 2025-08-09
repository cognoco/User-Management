"use client";

import { useQuery } from '@tanstack/react-query';
import { ReactNode } from 'react';

export interface DashboardData {
  team: {
    activeMembers: number;
    pendingMembers: number;
    totalMembers: number;
    seatUsage: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  subscription: {
    plan: string;
    status: string;
    trialEndsAt: string | null;
    currentPeriodEndsAt: string | null;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch('/api/admin/dashboard');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  return response.json();
}

export interface AdminDashboardProps {
  children: (props: {
    data: DashboardData | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  }) => ReactNode;
}

/**
 * Headless AdminDashboard component that provides dashboard data through render props
 * This component handles the data fetching logic without any UI rendering
 */
export function AdminDashboard({ children }: AdminDashboardProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: fetchDashboardData,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return <>{children({ data, isLoading, isError, refetch })}</>;
}
