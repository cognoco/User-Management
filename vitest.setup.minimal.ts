// Minimal setup to test if vitest works
import { vi } from 'vitest';

// Just set basic env vars
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dummy-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

console.log('Vitest minimal setup loaded');