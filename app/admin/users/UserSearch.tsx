'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
// Note: Using native select for react-hook-form compatibility in filters
import { DatePicker } from '@/ui/primitives/datepicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Skeleton } from '@/ui/primitives/skeleton';
import { useAdminUsers } from '@/hooks/admin/useAdminUsers';
import { RefreshManager } from '@/utils/refreshManager';
import { useRealtimeUserSearch } from '@/hooks/admin/useRealtimeUserSearch';

const searchFormSchema = z.object({
  query: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'all']).default('all'),
  role: z.string().optional(),
  dateCreatedStart: z.date().optional(),
  dateCreatedEnd: z.date().optional(),
  dateLastLoginStart: z.date().optional(),
  dateLastLoginEnd: z.date().optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastLoginAt', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  teamId: z.string().optional(),
});

type SearchFormValues = z.infer<typeof searchFormSchema>;

export interface UserSearchProps {
  initialSearchParams?: Record<string, any>;
  onSearch?: (params: Record<string, any>) => void;
}

export function UserSearch({ initialSearchParams = {}, onSearch }: UserSearchProps) {
  const [page, setPage] = useState(1);
  const {
    users,
    pagination,
    isLoading,
    error,
    searchUsers,
    refreshSearch,
    setUsers,
    setPagination,
  } = useAdminUsers();

  const refreshManagerRef = useRef<RefreshManager | null>(null);

  const handleRealtimeUpdate = useCallback(
    (payload: any) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      console.log(`Realtime event: ${eventType}`, payload);

      if (eventType === 'UPDATE' && newRecord && users.some((u) => u.id === newRecord.id)) {
        setUsers((prev) => prev.map((u) => (u.id === newRecord.id ? { ...u, ...newRecord } : u)));
      } else if (eventType === 'INSERT') {
        refreshSearch();
      } else if (eventType === 'DELETE' && oldRecord) {
        setUsers((prev) => prev.filter((u) => u.id !== oldRecord.id));
        if (pagination) {
          setPagination((prev) =>
            prev
              ? {
                  ...prev,
                  totalCount: Math.max(0, prev.totalCount - 1),
                  totalPages: Math.ceil(Math.max(0, prev.totalCount - 1) / prev.limit),
                }
              : null
          );
        }
      } else {
        refreshSearch();
      }
    },
    [users, pagination, refreshSearch]
  );

  const { isConnected } = useRealtimeUserSearch({
    onUserChange: handleRealtimeUpdate,
    enabled: true,
  });

  const { register, handleSubmit, control, reset, watch, setValue } = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema) as Resolver<SearchFormValues>,
    defaultValues: {
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ...initialSearchParams,
    },
  });

  const watchedValues = watch();

  useEffect(() => {
    refreshManagerRef.current = new RefreshManager(60000);
    return () => {
      refreshManagerRef.current?.stopAll();
    };
  }, []);

  useEffect(() => {
    if (refreshManagerRef.current) {
      refreshManagerRef.current.startRefresh('userSearch', async () => {
        console.log('Performing background refresh...');
        await refreshSearch();
      });
    }
    return () => {
      refreshManagerRef.current?.stopRefresh('userSearch');
    };
  }, [refreshSearch, watchedValues]);

  useEffect(() => {
    searchUsers({
      page,
      ...watchedValues,
    });
  }, [page]);

  useEffect(() => {
    if (initialSearchParams && Object.keys(initialSearchParams).length > 0) {
      Object.entries(initialSearchParams).forEach(([key, value]) => {
        if (value !== undefined) {
          setValue(key as any, value as any);
        }
      });
      searchUsers({
        ...initialSearchParams,
        page: 1,
      });
      setPage(1);
    }
  }, [initialSearchParams, setValue, searchUsers]);

  const onSubmit = (data: SearchFormValues) => {
    setPage(1);
    const params = { ...data, page: 1 };
    searchUsers(params);
    if (onSearch) {
      onSearch(params);
    }
  };

  const handleReset = () => {
    reset();
    setPage(1);
    searchUsers({ page: 1, status: 'all', sortBy: 'createdAt', sortOrder: 'desc' });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
      setPage(newPage);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Search</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="query" className="text-sm font-medium">Search</label>
                <Input id="query" placeholder="Name, email, etc." {...register('query')} />
              </div>
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">Status</label>
                <select id="status" className="w-full border rounded px-2 py-1 text-sm" {...register('status')}>
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-medium">Role</label>
                <select id="role" className="w-full border rounded px-2 py-1 text-sm" {...register('role')}>
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Created Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker control={control} name="dateCreatedStart" placeholder="From" />
                  <DatePicker control={control} name="dateCreatedEnd" placeholder="To" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Login Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker control={control} name="dateLastLoginStart" placeholder="From" />
                  <DatePicker control={control} name="dateLastLoginEnd" placeholder="To" />
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleReset}>Reset</Button>
              <Button type="submit" disabled={isLoading}>Search</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Showing {users.length} of {pagination?.totalCount || 0} results
            </p>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>Previous</Button>
              <span className="text-sm">Page {page} of {pagination?.totalPages || 1}</span>
              <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={page === pagination?.totalPages}>Next</Button>
            </div>
          </div>
          <div className="rounded-md border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Role</th>
                  <th className="p-3 font-medium">Created</th>
                  <th className="p-3 font-medium">Last Login</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="p-3">{`${user.firstName} ${user.lastName}`}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : user.status === 'inactive'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}>{user.status}</span>
                    </td>
                    <td className="p-3">{user.role}</td>
                    <td className="p-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm">View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
