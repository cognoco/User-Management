import { useState, useMemo } from 'react';
import { useTeamMembers } from '@/hooks/team/useTeamMembers';
import { TeamMember } from '@/core/team/models';

export interface TeamMembersListRenderProps {
  members: TeamMember[];
  updateRole: (userId: string, role: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  refresh: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  filter: string;
  setFilter: (v: string) => void;
  sortBy: 'name' | 'role' | 'status';
  setSortBy: (v: 'name' | 'role' | 'status') => void;
}

export interface TeamMembersListProps {
  teamId: string;
  onUpdateRole?: (userId: string, role: string) => Promise<void>;
  onRemove?: (userId: string) => Promise<void>;
  children: (props: TeamMembersListRenderProps) => React.ReactNode;
}

export function TeamMembersList({ teamId, onUpdateRole, onRemove, children }: TeamMembersListProps) {
  const {
    members,
    updateTeamMember,
    removeTeamMember,
    fetchTeamMembers,
    isLoading,
    error
  } = useTeamMembers(teamId);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'status'>('name');

  const filtered = useMemo(() => {
    const data = members.filter((m) =>
      m.userId.toLowerCase().includes(filter.toLowerCase())
    );
    return data.sort((a, b) => {
      if (sortBy === 'role') return a.role.localeCompare(b.role);
      if (sortBy === 'status') return Number(a.isActive) - Number(b.isActive);
      return a.userId.localeCompare(b.userId);
    });
  }, [members, filter, sortBy]);

  const updateRole = async (userId: string, role: string) => {
    if (onUpdateRole) await onUpdateRole(userId, role);
    else await updateTeamMember(userId, { role });
  };

  const removeMember = async (userId: string) => {
    if (onRemove) await onRemove(userId);
    else await removeTeamMember(userId);
  };

  return children({
    members: filtered,
    updateRole,
    removeMember,
    refresh: async () => { await fetchTeamMembers(); },
    isLoading,
    error,
    filter,
    setFilter,
    sortBy,
    setSortBy
  });
}
