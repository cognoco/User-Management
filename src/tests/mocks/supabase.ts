// Universal Supabase Mock Implementation
// This mock is designed to be used globally across all tests
import { vi, Mock } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { 
  AuthResponse, 
  AuthError, 
  UserResponse, 
  SignInWithPasswordCredentials, 
  SignUpWithPasswordCredentials, 
  AuthTokenResponsePassword, 
  AuthMFAListFactorsResponse, 
  MFAChallengeParams, 
  AuthMFAChallengeResponse, 
  MFAVerifyParams, 
  AuthMFAVerifyResponse, 
  MFAEnrollParams, 
  AuthMFAEnrollResponse,
  AuthMFAUnenrollResponse, 
  MFAUnenrollParams
} from '@supabase/auth-js';

// Define a type for the RPC response structure
interface SupabaseRpcResponse { data: unknown | null; error: unknown | null }

// Enable or disable mock debug logging
const ENABLE_DEBUG = true;
const debug = (...args: any[]) => {
  if (ENABLE_DEBUG) {
    console.log('[SUPABASE MOCK]', ...args);
  }
};

// Default mock data for different tables
const DEFAULT_TABLE_RESPONSES: Record<string, any> = {
  organizations: {
    data: {
      id: 'org-123',
      name: 'Test Organization',
      security_settings: {
        session_timeout_mins: 60,
        max_sessions_per_user: 3,
        enforce_ip_restrictions: true,
        allowed_ip_ranges: ['192.168.1.0/24', '10.0.0.0/16'],
        enforce_device_restrictions: true,
        allowed_device_types: ['desktop', 'mobile'],
        require_reauth_for_sensitive: true,
        sensitive_actions: ['payment', 'user_management', 'api_keys']
      }
    },
    error: null
  },
  organization_members: {
    data: [
      { user_id: 'user-123', organization_id: 'org-123', email: 'user@example.com', role: 'member', active_sessions: 2, last_active: '2023-06-15T14:30:00Z' }
    ],
    error: null
  },
  profiles: {
    data: [
      { id: 'user-123', first_name: 'Test', last_name: 'User', email: 'test@example.com' },
      { id: 'user-456', first_name: 'Another', last_name: 'User', email: 'another@example.com' }
    ],
    error: null
  },
  users: {
    data: [
      { id: 'user-123', email: 'test@example.com', created_at: '2023-01-01T00:00:00Z' },
      { id: 'user-456', email: 'another@example.com', created_at: '2023-01-02T00:00:00Z' }
    ],
    error: null
  }
};

/**
 * Creates a robust chainable query builder for Supabase mocks
 * This ensures all methods return a chainable object with consistent behavior
 */
function createChainableQueryBuilder(tableName: string) {
  debug(`Creating query builder for table: ${tableName}`);

  // Create a state object to track the query being built
  const state = {
    table: tableName,
    filters: [] as Array<{type: string, field?: string, value?: any}>,
    select_columns: '*',
    insert_data: null as any,
    update_data: null as any,
    upsert_data: null as any,
    delete_flag: false,
    order_by: null as any,
    limit_count: null as number | null,
    range_from: null as number | null,
    range_to: null as number | null,
  };

  // Create a function that will be our builder object
  // It needs to be a function so we can use it as both an object and a function
  const builder: any = function() {
    debug('Function form of builder called');
    return builder;
  };

  // Helper to get a mock response based on the query state
  const getMockResponse = () => {
    debug(`Resolving query for table: ${state.table} with state:`, JSON.stringify(state));
    
    // Prioritized handling for 'organizations' table using globalThis.__TEST_ORG__
    if (state.table === 'organizations' && typeof globalThis !== 'undefined') {
      if ((globalThis as any).__TEST_ORG_ERROR__) {
        debug(`[OrgDataPriority] Returning __TEST_ORG_ERROR__ for ${state.table}`);
        return { data: null, error: (globalThis as any).__TEST_ORG_ERROR__ };
      }
      if ((globalThis as any).__TEST_ORG__) {
        debug(`[OrgDataPriority] Using __TEST_ORG__ directly for ${state.table}. Data:`, (globalThis as any).__TEST_ORG__);
        // Deep copy to prevent accidental modification of the global object
        const dataToReturn = JSON.parse(JSON.stringify((globalThis as any).__TEST_ORG__));
        // This path assumes that if __TEST_ORG__ is set, it's the definitive single object result for typical .select().single() query for organization context.
        return { data: dataToReturn, error: null };
      }
      debug(`[OrgDataPriority] globalThis.__TEST_ORG__ or __TEST_ORG_ERROR__ NOT found for ${state.table}. Proceeding with normal logic.`);
    }

    // Prioritized handling for 'organization_members' if default data exists
    if (state.table === 'organization_members' && DEFAULT_TABLE_RESPONSES[state.table]?.data) {
      debug(`[MembersDataPriority] Using DEFAULT_TABLE_RESPONSES for ${state.table}.`);
      let membersData = JSON.parse(JSON.stringify(DEFAULT_TABLE_RESPONSES[state.table].data));
      const membersError = DEFAULT_TABLE_RESPONSES[state.table].error || null;

      // Apply the 'eq' filter for 'organization_id' which is common for this table
      const orgIdFilter = state.filters.find(f => f.type === 'eq' && f.field === 'organization_id');
      if (orgIdFilter && orgIdFilter.value !== undefined) {
        membersData = membersData.filter((member: any) => member.organization_id === orgIdFilter.value);
        debug(`[MembersDataPriority] Filtered members for orgId ${orgIdFilter.value}:`, membersData);
      } else {
        debug(`[MembersDataPriority] No specific orgIdFilter or filter value undefined for members query.`);
        // Depending on desired behavior, you might want to return all members or an empty array if orgId is expected but not in filters
        // For now, if no filter, it returns all members from default mock, which might be okay for some tests or might need refinement.
      }
      return { data: membersData, error: membersError };
    }

    let baseData: any;
    let baseError: any = null;

    // 1. Determine base data and error
    if (state.table === 'organizations') {
      if (typeof globalThis !== 'undefined' && (globalThis as any).__TEST_ORG_ERROR__) {
        baseError = (globalThis as any).__TEST_ORG_ERROR__;
        debug(`[OrgData] Using globalThis.__TEST_ORG_ERROR__ for ${state.table}:`, baseError);
      } else if (typeof globalThis !== 'undefined' && (globalThis as any).__TEST_ORG__) {
        baseData = (globalThis as any).__TEST_ORG__;
        debug(`[OrgData] Using globalThis.__TEST_ORG__ for ${state.table}. Data found.`); // Simplified log
      } else {
        debug(`[OrgData] globalThis.__TEST_ORG__ or __TEST_ORG_ERROR__ NOT found for ${state.table}. Checking DEFAULT_TABLE_RESPONSES.`);
        // Fall through: baseData remains undefined, will be picked by DEFAULT_TABLE_RESPONSES logic below
      }
    }

    if (baseData === undefined && baseError === null) { // If not sourced from __TEST_ORG__ (for orgs) or already errored
      const defaultResponse = DEFAULT_TABLE_RESPONSES[state.table];
      if (defaultResponse) {
        baseData = defaultResponse.data;
        baseError = defaultResponse.error;
        debug(`Using DEFAULT_TABLE_RESPONSES for ${state.table}: Data found. Error:`, baseError);
      } else {
        baseData = []; // Default to empty array if no specific mock
        debug(`No specific mock in DEFAULT_TABLE_RESPONSES for ${state.table}, defaulting to empty array.`);
      }
    }
    
    if (baseError) {
      debug(`Error determined for ${state.table}, returning error:`, baseError);
      return { data: null, error: baseError };
    }

    // 2. Make a deep copy of the base data to prevent side effects
    let processedData = JSON.parse(JSON.stringify(baseData));
    debug(`Initial processedData for ${state.table} (after copy):`, processedData);

    // 3. Apply filters and operations
    // WARNING: This is a simplified filter application. A full implementation would be more complex.
    if (Array.isArray(processedData)) {
      state.filters.forEach(filter => {
        if (filter.type === 'eq' && filter.field && filter.value !== undefined) {
          processedData = processedData.filter((item: any) => item[filter.field!] === filter.value);
        }
        // Add more filter types here (gt, lt, like, etc.) if needed for comprehensive mocking
      });
      debug(`ProcessedData after 'eq' filters for ${state.table}:`, processedData);
    }

    // 4. Apply update if state.update_data exists
    if (state.update_data) {
      debug(`Applying update for ${state.table}:`, state.update_data);
      const idFilter = state.filters.find(f => f.type === 'eq' && f.field === 'id');
      
      if (Array.isArray(processedData)) {
        if (idFilter && idFilter.value !== undefined) {
          // Update specific item in array
          processedData = processedData.map((item: any) => 
            item.id === idFilter.value ? { ...item, ...state.update_data } : item
          );
          debug(`ProcessedData after update (array, with idFilter) for ${state.table}:`, processedData);
        } else {
          // If no idFilter, or it's an update on a collection without specific ID (less common for typical updates)
          // This branch might need refinement based on actual Supabase behavior for such cases.
          // For now, if it's an array and update_data exists, we might not alter it without a target.
          debug(`Update data exists for array, but no specific ID filter or ambiguous target for ${state.table}. Data:`, processedData);
        }
      } else if (processedData && typeof processedData === 'object') {
        // If processedData is a single object (e.g., from globalThis.__TEST_ORG__ or after a .single() type filter)
        // And an eq filter matches its ID, or if no specific ID filter (apply to the object)
        if (idFilter && processedData.id === idFilter.value) {
          processedData = { ...processedData, ...state.update_data };
          debug(`ProcessedData after update (single object, matched idFilter) for ${state.table}:`, processedData);
        } else if (!idFilter && state.table === 'organizations' && (globalThis as any).__TEST_ORG__) {
          // Special case: if updating 'organizations' and globalThis.__TEST_ORG__ was the source,
          // and no specific ID filter was part of the update chain (e.g. supabase.from('orgs').update({...}).eq('id', id) IS NOT CALLED, but await supabase.from('orgs').update({...}) )
          // This scenario is less common for targeted updates.
          // However, if the intent is to update the global mock object itself:
          processedData = { ...processedData, ...state.update_data };
          // Optionally, update globalThis.__TEST_ORG__ if this mock should persist changes globally for this test run
          // if (state.table === 'organizations' && (globalThis as any).__TEST_ORG__) {
          //   (globalThis as any).__TEST_ORG__ = { ...(globalThis as any).__TEST_ORG__, ...state.update_data };
          // }
          debug(`ProcessedData after update (single object, e.g. global.__TEST_ORG__) for ${state.table}:`, processedData);
        }
      }
    }

    // 5. Apply 'single' or 'maybeSingle' transformation
    const isSingle = state.filters.some(f => f.type === 'single');
    const isMaybeSingle = state.filters.some(f => f.type === 'maybeSingle');

    if (isSingle || isMaybeSingle) {
      if (Array.isArray(processedData)) {
        if (processedData.length > 1 && isSingle) {
          // PostgREST behavior for .single() with multiple rows
          debug(`Error: Single was called on ${state.table}, but multiple rows were found.`, processedData);
          return { 
            data: null, 
            error: { 
              message: 'JSON object requested, multiple (or no) rows returned', 
              code: 'PGRST116', // Standard PostgREST error code for this
              details: null, 
              hint: null 
            } 
          };
        }
        processedData = processedData.length > 0 ? processedData[0] : null;
        debug(`ProcessedData after single/maybeSingle (from array) for ${state.table}:`, processedData);
      } else if (processedData === null && isSingle) {
        // If .single() and data is already null (e.g. after filtering led to no results)
         debug(`Error: Single was called on ${state.table}, but no rows were found.`);
         return { 
            data: null, 
            error: { 
              message: 'JSON object requested, multiple (or no) rows returned', 
              code: 'PGRST116',
              details: null, 
              hint: null 
            }
          };
      }
      // If processedData is already a single object or null (for maybeSingle), it remains as is.
      debug(`ProcessedData after single/maybeSingle (already object/null) for ${state.table}:`, processedData);
    }
    
    debug(`Final processedData for ${state.table}:`, processedData);
    return { data: processedData, error: null }; // Assuming baseError was handled or null
  };

  // Make the builder thenable so it works with await
  builder.then = function(resolve: any, reject?: any) {
    debug(`Resolving query for table: ${tableName}`, state);
    const response = getMockResponse();
    return Promise.resolve(response).then(resolve, reject);
  };

  // Add all the chainable methods
  // Filter methods
  const filterMethods = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is', 'contained', 'overlaps'];
  filterMethods.forEach(method => {
    builder[method] = vi.fn(function(field: string, value: any) {
      debug(`Filter method ${method} called with:`, field, value);
      state.filters.push({ type: method, field, value });
      return builder;
    });
  });

  // Composite filter methods
  builder.or = vi.fn(function(filterStr: string) {
    debug(`Or filter called with:`, filterStr);
    state.filters.push({ type: 'or', value: filterStr });
    return builder;
  });

  builder.filter = vi.fn(function(field: string, operator: string, value: any) {
    debug(`Filter called with:`, field, operator, value);
    state.filters.push({ type: 'filter', field, value: [operator, value] });
    return builder;
  });

  // Data operations
  builder.select = vi.fn(function(columns: string) {
    debug(`Select called with columns:`, columns);
    state.select_columns = columns;
    return builder;
  });

  builder.insert = vi.fn(function(data: any) {
    debug(`Insert called with:`, data);
    state.insert_data = data;
    return builder;
  });

  builder.update = vi.fn(function(data: any) {
    debug(`Update called with:`, data);
    state.update_data = data;
    return builder;
  });

  builder.upsert = vi.fn(function(data: any) {
    debug(`Upsert called with:`, data);
    state.upsert_data = data;
    return builder;
  });

  builder.delete = vi.fn(function() {
    debug(`Delete called`);
    state.delete_flag = true;
    return builder;
  });

  // Result retrieving methods
  builder.single = vi.fn(function() {
    debug(`Single called`);
    state.filters.push({ type: 'single' });
    const response = getMockResponse();
    return Promise.resolve(response);
  });

  builder.maybeSingle = vi.fn(function() {
    debug(`MaybeSingle called`);
    state.filters.push({ type: 'maybeSingle' });
    const response = getMockResponse();
    return Promise.resolve(response);
  });

  // Ordering and pagination
  builder.order = vi.fn(function(column: string, options: any) {
    debug(`Order called with:`, column, options);
    state.order_by = { column, options };
    return builder;
  });

  builder.limit = vi.fn(function(count: number) {
    debug(`Limit called with:`, count);
    state.limit_count = count;
    return builder;
  });

  builder.range = vi.fn(function(from: number, to: number) {
    debug(`Range called with:`, from, to);
    state.range_from = from;
    state.range_to = to;
    return builder;
  });

  // Make sure all methods used in the codebase are implemented
  // These are additional methods that might be used
  ['not', 'match', 'textSearch', 'range', 'contains', 'containedBy', 'csv']
    .forEach(method => {
      if (!builder[method]) {
        builder[method] = vi.fn(function(...args: any[]) {
          debug(`Method ${method} called with:`, args);
          state.filters.push({ type: method, value: args });
          return builder;
        });
      }
    });

  return builder;
}

// Create the complete mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ 
      data: { user: { id: 'user-123', email: 'test@example.com' } }, 
      error: null 
    }) as Mock,
    
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { 
        user: { id: 'user-123', email: 'test@example.com' }, 
        session: { access_token: 'test-token' } 
      },
      error: null
    }) as Mock,
    
    signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }) as Mock,
    
    signUp: vi.fn().mockResolvedValue({ 
      data: { user: { id: 'user-123', email: 'test@example.com' }, session: null },
      error: null 
    }) as Mock,
    
    signOut: vi.fn().mockResolvedValue({ error: null }) as Mock,
    
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }) as Mock,
    
    updateUser: vi.fn().mockResolvedValue({ 
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null 
    }) as Mock,
    
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
      error: null,
    }),
    
    getSession: vi.fn().mockResolvedValue({
      data: { 
        session: { 
          access_token: 'test-token', 
          user: { id: 'user-123', email: 'test@example.com' } 
        }
      },
      error: null
    }) as Mock,
    
    refreshSession: vi.fn().mockResolvedValue({
      data: { 
        session: { 
          access_token: 'refreshed-token', 
          user: { id: 'user-123', email: 'test@example.com' } 
        }
      },
      error: null
    }) as Mock,
    
    mfa: {
      listFactors: vi.fn().mockResolvedValue({ 
        data: { factors: [] }, 
        error: null 
      }) as Mock,
      
      challenge: vi.fn().mockResolvedValue({ 
        data: { id: 'challenge-123' }, 
        error: null 
      }) as Mock,
      
      verify: vi.fn().mockResolvedValue({ 
        data: { user: { id: 'user-123' } }, 
        error: null 
      }) as Mock,
      
      enroll: vi.fn().mockResolvedValue({ 
        data: { id: 'factor-123' }, 
        error: null 
      }) as Mock,
      
      unenroll: vi.fn().mockResolvedValue({ 
        data: {}, 
        error: null 
      }) as Mock,
      
      updateFactor: vi.fn().mockResolvedValue({ data: {}, error: null }),
      
      verifyWithBackupCode: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
  
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ 
        data: { path: 'test-file.jpg' }, 
        error: null 
      }),
      
      download: vi.fn().mockResolvedValue({ 
        data: new Blob(['test-file-content']), 
        error: null 
      }),
      
      getPublicUrl: vi.fn().mockReturnValue({ 
        data: { publicUrl: 'https://example.com/test-file.jpg' } 
      }),
      
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      
      list: vi.fn().mockResolvedValue({ 
        data: [{ name: 'file1.jpg' }, { name: 'file2.jpg' }], 
        error: null 
      }),
      
      move: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
  
  rpc: vi.fn().mockImplementation((func, params) => {
    debug(`RPC function called: ${func}`, params);
    
    if (func === 'terminate_user_sessions') {
      return Promise.resolve({ data: { count: 3 }, error: null });
    }
    
    return Promise.resolve({ data: null, error: null });
  }) as Mock,
  
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockResolvedValue({})
  }),
  
  from: vi.fn((tableName: string) => {
    debug(`supabase.from called with table: ${tableName}`);
    if (!(globalThis as any).__SUPABASE_FEEDBACK_BUILDER__ && tableName === 'feedback') {
      (globalThis as any).__SUPABASE_FEEDBACK_BUILDER__ = createChainableQueryBuilder(tableName);
    }
    if (tableName === 'feedback') {
      return (globalThis as any).__SUPABASE_FEEDBACK_BUILDER__;
    }
    const builder = createChainableQueryBuilder(tableName);
    if (tableName === 'organizations') {
      (globalThis as any).__LAST_ORGANIZATIONS_BUILDER__ = builder;
      debug(`Stored __LAST_ORGANIZATIONS_BUILDER__ for table: ${tableName}`);
    }
    return builder;
  }),
};

// Main export - the Supabase client mock
export const supabase = mockSupabase as unknown as SupabaseClient;

// For test specific needs
export const createClient = vi.fn().mockReturnValue(supabase);

// Mock getServiceSupabase that properly validates environment variables like the real implementation
export const getServiceSupabase = vi.fn().mockImplementation(() => {
  // Check for required environment variables
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured.');
  }
  
  // Return a mock client
  return supabase;
});

// Reset helper function for tests that need to reset mock state
export function resetSupabaseMock() {
  debug('Resetting Supabase mock state');
  vi.clearAllMocks();
  // Clear any global test variables
  if (typeof globalThis !== 'undefined') {
    delete (globalThis as any).__TEST_ORG__;
    delete (globalThis as any).__TEST_ORG_ERROR__;
    delete (globalThis as any).__SUPABASE_FEEDBACK_BUILDER__;
  }
}

// Helper for adding custom table responses for specific tests
export function setTableMockData(tableName: string, mockData: any) {
  debug(`Setting custom mock data for table: ${tableName}`, mockData);
  DEFAULT_TABLE_RESPONSES[tableName] = mockData;
}

/*
  How to use this mock in tests:
  
  1. Global usage (handled in vitest.setup.ts):
     The mock is automatically applied to imports from '@/lib/database/supabase'
  
  2. Test-specific overrides:
     ```
     import { supabase, resetSupabaseMock, setTableMockData } from '@/tests/mocks/supabase';
     
     beforeEach(() => {
       resetSupabaseMock();
       // Customize mock responses for this test if needed
       setTableMockData('profiles', { 
         data: [{ id: 'custom-id', name: 'Custom Name' }],
         error: null 
       });
       
       // Or for specific organization tests:
       globalThis.__TEST_ORG__ = { 
         id: 'custom-org', 
         name: 'Custom Org',
         security_settings: {} 
       };
     });
     
     afterEach(() => {
       // Clean up any global overrides
       resetSupabaseMock();
     });
     ```
  
  3. Method mocking for specific tests:
     ```
     // Mock a specific method for one test
     (supabase.auth.signInWithPassword as Mock).mockResolvedValueOnce({
       data: { user: { id: 'special-user' }, session: {} },
       error: null
     });
     ```
*/ 