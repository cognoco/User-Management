import React from 'react';
import type { Webhook } from '@/core/webhooks/models';

export function WebhookCard({ webhook }: { webhook: Webhook }): React.ReactElement {
  return (
    <div className="border p-2 rounded">
      <div>{webhook.name}</div>
      <div>{webhook.url}</div>
    </div>
  );
}
