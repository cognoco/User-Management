import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Checkbox } from '@/ui/primitives/checkbox';
import {
  ApiKeyForm as HeadlessApiKeyForm,
  ApiKeyFormProps as HeadlessApiKeyFormProps,
} from '@/ui/headless/api-keys/ApiKeyForm';

export interface ApiKeyFormProps extends Omit<HeadlessApiKeyFormProps, 'children'> {
  availablePermissions: string[];
}

export function ApiKeyForm({ availablePermissions, onSubmit, defaultPermissions }: ApiKeyFormProps) {
  return (
    <HeadlessApiKeyForm onSubmit={onSubmit} defaultPermissions={defaultPermissions}>
      {({
        name,
        setName,
        permissions,
        togglePermission,
        expiresInDays,
        setExpiresInDays,
        handleSubmit,
        isSubmitting,
        error,
        createdKey
      }) => (
        <Card>
          <CardHeader>
            <CardTitle>Create API Key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            {createdKey && (
              <div className="bg-muted p-2 rounded text-sm flex items-center justify-between">
                <span className="font-mono break-all">{createdKey.keySecret}</span>
                <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(createdKey.keySecret || '')}>Copy</Button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Permissions</p>
                {availablePermissions.map((p) => (
                  <label key={p} className="flex items-center space-x-2 text-sm">
                    <Checkbox checked={permissions.includes(p)} onCheckedChange={() => togglePermission(p)} />
                    <span>{p}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expires in days</label>
                <Input type="number" value={expiresInDays ?? ''} onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Creating...' : 'Create API Key'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </HeadlessApiKeyForm>
  );
}
