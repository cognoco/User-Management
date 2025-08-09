export class RealtimeClient {
  constructor(..._args: any[]) {
    // noop – stubbed for browser bundle to avoid @supabase/realtime-js heavy dependency
  }

  connect() {}
  removeChannel() {}
  on() { return { unsubscribe() {} }; }
  off() {}
  subscribe() { return { unsubscribe() {} }; }
  unsubscribe() {}
}