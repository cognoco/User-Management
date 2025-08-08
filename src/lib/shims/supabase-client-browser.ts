// Browser-safe Supabase client stub to prevent bundling server/node deps
// Returns harmless defaults suitable for builds; real data should be fetched via API routes

type QueryResult<T = any> = { data?: T; error?: { message: string } | null };

function notAvailable<T = any>(): Promise<QueryResult<T>> {
  return Promise.resolve({ data: undefined as any, error: { message: 'Supabase client is not available in browser. Use API routes.' } });
}

export const supabase = {
  from(_table: string) {
    return {
      select: async () => ({ data: [], error: null } as QueryResult<any[]>),
      insert: async (_rows: any[]) => ({ data: null, error: null } as QueryResult),
      update: async (_values: any) => ({ data: null, error: null } as QueryResult),
      delete: async () => ({ data: null, error: null } as QueryResult),
      eq: (_col: string, _val: any) => ({ select: notAvailable, update: notAvailable, delete: notAvailable }),
      order: (_col: string, _opts?: any) => ({ select: notAvailable }),
    };
  },
  auth: {
    getUser: async () => ({ data: { user: { id: '' } }, error: null }),
  },
  storage: {
    from(_bucket: string) {
      return {
        upload: async (_name: string, _file: any) => ({ data: null, error: null } as QueryResult),
        getPublicUrl: (_path: string) => ({ data: { publicUrl: '' } }),
      };
    },
  },
  channel(_name: string) {
    return {
      on: (_event: any, _filter: any, _cb: any) => {},
      subscribe: (_cb?: any) => {},
      unsubscribe: () => {},
      presenceState: () => ({}),
      track: async () => {},
    } as any;
  },
} as const;

export default supabase;

