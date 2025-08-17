import React from 'react';
import { WebhookEvents as HeadlessWebhookEvents } from '@/ui/headless/webhooks/WebhookEvents';
import { Checkbox } from '@/ui/primitives/checkbox';

interface WebhookEventsProps {
  events?: string[];
  available?: string[];
  onChange?: (events: string[]) => void;
  children?: (props: { selected: string[]; toggle: (e: string) => void }) => React.ReactNode;
}

const defaultEvents = ['user.created', 'user.deleted'];

export function WebhookEvents({ 
  events = defaultEvents,
  available = defaultEvents,
  onChange,
  children
}: WebhookEventsProps): React.ReactElement {
  const renderDefault = ({ selected, toggle }: { selected: string[]; toggle: (e: string) => void }): React.ReactElement => (
    <div className="space-y-2">
      {available.map((event) => (
        <label key={event} className="flex items-center space-x-2">
          <Checkbox 
            checked={selected.includes(event)} 
            onCheckedChange={() => toggle(event)} 
          />
          <span>{event}</span>
        </label>
      ))}
    </div>
  );

  return (
    <HeadlessWebhookEvents events={events} onChange={onChange}>
      {children || renderDefault}
    </HeadlessWebhookEvents>
  );
}