import React, { useState } from 'react';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Select, SelectItem } from '@/ui/primitives/select';
import { UserRoleAssigner, UserRoleAssignerProps } from '../../headless/admin/UserRoleAssigner';

export function UserRoleAssignerStyled(props: Omit<UserRoleAssignerProps, 'render'> & { title?: string }): React.ReactElement {
  const [query, setQuery] = useState('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  return (
    <UserRoleAssigner
      {...props}
      render={({ users, roles, search, selectUser, selectedUserId, assign, _remove, effectivePermissions, _isLoading, error }) => (
        <Card>
          <CardHeader>
            <CardTitle>{props.title || 'User Roles'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search users" />
              <Button onClick={() => search(query)}>Search</Button>
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <div className="flex flex-wrap gap-4">
              {users.map(u => (
                <Button key={u.id} variant={selectedUserId === u.id ? 'default' : 'outline'} onClick={() => selectUser(u.id)}>
                  {u.firstName || u.email}
                </Button>
              ))}
            </div>
            {selectedUserId && (
              <div className="space-y-2">
                <div className="flex items-end space-x-2">
                  <Select onValueChange={(v) => assign(v, expiresAt ? new Date(expiresAt) : undefined)}>
                    <SelectItem value="" disabled>Select Role</SelectItem>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </Select>
                  <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
                </div>
                <div>
                  <p className="font-medium">Effective Permissions:</p>
                  <ul className="list-disc ml-6">
                    {effectivePermissions.map(p => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    />
  );
}
export default UserRoleAssignerStyled;
