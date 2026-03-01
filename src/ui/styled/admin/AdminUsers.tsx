import React from 'react';
import { Input } from '@/ui/primitives/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/ui/primitives/table';
import { Button } from '@/ui/primitives/button';
import { Alert } from '@/ui/primitives/alert';
import {
  AdminUsers as HeadlessAdminUsers,
  AdminUsersProps as HeadlessAdminUsersProps,
  ROLE_OPTIONS,
} from '@/ui/headless/admin/AdminUsers';

export type AdminUsersProps = Omit<HeadlessAdminUsersProps, 'children'>;

export const AdminUsers: React.FC<AdminUsersProps> = ({ fetchUsers, handleRoleChange }) => (
  <HeadlessAdminUsers fetchUsers={fetchUsers} handleRoleChange={handleRoleChange}>
    {({ filteredUsers, loading, error, search, setSearch, onRoleChange, handleRetry }) => (
      <div className="w-full max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Admin Users</h1>
        <div className="mb-4 flex gap-2 items-center">
          <Input
            placeholder="Search users"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
          />
        </div>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <Button size="sm" onClick={handleRetry} disabled={loading}>
                Retry
              </Button>
            </div>
          </Alert>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4}>Loading...</TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>No users found.</TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role || 'user'}</TableCell>
                  <TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : ''}</TableCell>
                  <TableCell>
                    <select
                      value={user.role || 'user'}
                      onChange={(e) => onRoleChange(user, e.target.value)}
                      disabled={loading}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    )}
  </HeadlessAdminUsers>
);

export default AdminUsers;
