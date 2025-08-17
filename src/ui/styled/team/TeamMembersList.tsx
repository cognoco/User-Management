// NOTE: Pagination and seat usage logic here is custom and no equivalent
// headless component currently exists, so this component keeps its own logic.
import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Badge } from '@/ui/primitives/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/primitives/avatar';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  UserPlus,
} from 'lucide-react';
import { usePermission } from '@/hooks/permission/usePermissions';
import { Skeleton } from '@/ui/primitives/skeleton';
import { Progress } from '@/ui/primitives/progress';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  image: string | null;
  teamMember: {
    id: string;
    role: string;
    status: string;
    joinedAt: string;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface SeatUsage {
  used: number;
  total: number;
  percentage: number;
}

interface TeamMembersResponse {
  users: TeamMember[];
  pagination: PaginationInfo;
  seatUsage: SeatUsage;
}

export function TeamMembersList(): React.ReactElement {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'status' | 'joinedAt'>('joinedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { hasPermission: canInvite } = usePermission({
    required: 'team.members.invite',
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error } = useQuery<TeamMembersResponse>({
    queryKey: ['team-members', page, limit, search, status, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        status,
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/team/members?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      return response.json();
    },
  });

  // Memoize handlers to prevent recreation on each render
  const handleSort = useCallback((column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  }, [sortBy]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  const handleStatusChange = useCallback((value: any) => {
    setStatus(value);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPage(prev => prev - 1);
  }, []);

  const handleNextPage = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  if (error) {
    return (
      <div className="p-4 text-center text-red-500" role="alert">
        Error loading team members. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchInput}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canInvite && (
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Seat usage indicator */}
      {data?.seatUsage && (
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Seat Usage: {data.seatUsage.used}/{data.seatUsage.total}
            </span>
            <span className="text-sm text-muted-foreground">
              {data.seatUsage.percentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={data.seatUsage.percentage} className="h-2" />
        </div>
      )}

      {/* Members table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('role')}
                  className="font-medium"
                >
                  Role
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('status')}
                  className="font-medium"
                >
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('joinedAt')}
                  className="font-medium"
                >
                  Joined
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: limit }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-4 w-[100px]" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[80px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              data?.users.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={member.image ?? undefined} />
                        <AvatarFallback>
                          {member.name
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase() ?? '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {member.teamMember.role.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.teamMember.status === 'active' ? 'default' : 'destructive'}
                    >
                      {member.teamMember.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(member.teamMember.joinedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data?.pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to{' '}
            {Math.min(page * limit, data.pagination.totalCount)} of{' '}
            {data.pagination.totalCount} members
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={!data.pagination.hasPreviousPage}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!data.pagination.hasNextPage}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}