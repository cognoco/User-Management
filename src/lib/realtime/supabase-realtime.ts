import type { RealtimeChannel, RealtimePresenceState } from '@supabase/realtime-js';
import { supabase } from '@/lib/supabase';

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

  let channel: RealtimeChannel;
  if (activeChannels[channelKey]) {
    channel = activeChannels[channelKey].channel;
  } else {
    channel = supabase.channel(`table:${tableName}:${eventType}`);
    activeChannels[channelKey] = { channel, tableName, eventType, callback };
  }

  (channel as any).on(
    'postgres_changes',
    {
      event: eventType === '*' ? '*' : eventType,
      schema: 'public',
      table: tableName,
    },
    callback
  );

  channel.subscribe((status) => {
    console.log(`Realtime subscription to ${tableName} (${eventType}): ${status}`);
  });

  return {
    unsubscribe: () => {
      channel.unsubscribe();
      delete activeChannels[channelKey];
    },
  };
}

export function createPresenceChannel(channelName: string, userId: string) {
  const channel = supabase.channel(channelName);

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    console.log('Presence state updated:', state);
  });

  channel.on('presence', { event: 'join' }, ({ newPresences }) => {
    console.log('User(s) joined:', newPresences);
  });

  channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
    console.log('User(s) left:', leftPresences);
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        user: userId,
        online_at: new Date().toISOString(),
      });
    }
  });

  return {
    channel,
    unsubscribe: () => channel.unsubscribe(),
    getState: () => channel.presenceState(),
  };
}
