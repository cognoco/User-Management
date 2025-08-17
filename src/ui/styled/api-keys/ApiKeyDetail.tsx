import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { Badge } from '@/ui/primitives/badge';
import { ApiKeyDetail as HeadlessApiKeyDetail } from '@/ui/headless/api-keys/ApiKeyDetail';
import type { ApiKey } from '@/core/api-keys/types';

export function ApiKeyDetail({ apiKey }: { apiKey: ApiKey }): React.ReactElement {
  return (
    <HeadlessApiKeyDetail apiKey={apiKey}>
      {({ apiKey, regenerate, revoke }) => (
        <Card>
          <CardHeader>
            <CardTitle>{apiKey.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm">{apiKey.keyPrefix}...</span>
              <Badge variant={apiKey.isActive ? 'default' : 'destructive'}>
                {apiKey.isActive ? 'Active' : 'Revoked'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {apiKey.permissions.map((p) => (
                <Badge key={p} variant="secondary">
                  {p}
                </Badge>
              ))}
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={regenerate}>
                Regenerate
              </Button>
              <Button size="sm" variant="destructive" onClick={revoke}>
                Revoke
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </HeadlessApiKeyDetail>
  );
}
