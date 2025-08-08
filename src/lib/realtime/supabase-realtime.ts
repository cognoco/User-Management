// Client-safe stubs to prevent bundling supabase in browser. Server should use API/SSE.
type RealtimeChannel = any;
export type RealtimePresenceState = Record<string, unknown>;

export type PresenceState = RealtimePresenceState;
export type RealtimeSubscription = { unsubscribe: () => void };

interface ChannelSubscription {
  channel: RealtimeChannel;
  tableName: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  callback: (payload: any) => void;
}

const activeChannels: Record<string, ChannelSubscription> = {};

export function subscribeToTableChanges(
  tableName: string,
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  callback: (payload: any) => void
): RealtimeSubscription {
  const channelKey = `${tableName}:${eventType}`;
  activeChannels[channelKey] = { channel: {} as any, tableName, eventType, callback };
  return { unsubscribe: () => { delete activeChannels[channelKey]; } };
}

export function createPresenceChannel(_channelName: string, _userId: string) {
  const channel = {} as any;
  return {
    channel,
    unsubscribe: () => {},
    getState: () => ({}),
  };
}
