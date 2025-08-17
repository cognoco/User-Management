import React from 'react';
import { SSOConnector as HeadlessSSOConnector, type SSOConnectorProps } from '@/ui/headless/sso/SSOConnector';
import { SsoProviderButton } from './SsoProviderButton';
import { Card, CardHeader, CardTitle, CardContent } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { Alert } from '@/ui/primitives/alert';

export type StyledSSOConnectorProps = Omit<SSOConnectorProps, 'children'>;

export function SSOConnector(props: StyledSSOConnectorProps): React.ReactElement {
  return (
    <HeadlessSSOConnector {...props}>
      {({ providers, connections, loading, error, connect, disconnect, refresh }) => (
        <div className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          <Card>
            <CardHeader>
              <CardTitle>Connected Providers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {connections.map(c => (
                <div key={c.id} className="flex items-center justify-between">
                  <span>{c.providerName}</span>
                  <Button size="sm" variant="destructive" onClick={() => disconnect(c.id)}>
                    Disconnect
                  </Button>
                </div>
              ))}
              {connections.length === 0 && <p className="text-sm">No connections</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Available Providers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {providers.map(p => (
                <SsoProviderButton key={p.id} provider={p} onClick={() => connect(p.id)} />
              ))}
              {providers.length === 0 && <p className="text-sm">No providers</p>}
            </CardContent>
          </Card>
          <Button onClick={refresh} disabled={loading}>Refresh</Button>
        </div>
      )}
    </HeadlessSSOConnector>
  );
}

export default SSOConnector;
