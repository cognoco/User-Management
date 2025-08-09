/**
 * Central configuration file for backend (Next.js) services within the project
 *
 * @deprecated Use the configuration utilities from `@/core/config/runtime-config`.
 */

// Supabase Configuration
// Ensure these are defined in .env.local or environment
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // This should NOT be prefixed with NEXT_PUBLIC_
};

// Redis Configuration (if used within the project)
export const redisConfig = {
  url: process.env.REDIS_URL || '',
  token: process.env.REDIS_TOKEN || '',
  enabled: Boolean(process.env.REDIS_URL && process.env.REDIS_TOKEN),
};

// Environment detection
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isTest = process.env.NODE_ENV === 'test';

// API Configuration (for internal API calls if needed, or reference)
export const apiConfig = {
  // Use NEXT_PUBLIC_ prefix if used client-side
  baseUrl: process.env.NEXT_PUBLIC_API_URL || (isProduction ? 'https://api.example.com' : 'http://localhost:3000/api'), 
  timeout: parseInt(process.env.API_TIMEOUT || '10000', 10),
};

// Auth Configuration (if needed by API routes)
export const authConfig = {
  tokenExpiryDays: parseInt(process.env.TOKEN_EXPIRY_DAYS || '7', 10),
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'user-management-session',
};

// Rate Limiting Configuration (used by rate-limit middleware/helper)
export const rateLimitConfig = {
  windowMs: parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || (15 * 60 * 1000).toString(),
    10
  ), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limit each IP to 100 requests per windowMs
  enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
};

// Environment validation - check required variables for the project
export function validateConfig() {
  const commonRequiredVariables = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: supabaseConfig.url },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: supabaseConfig.anonKey },
  ];

  // Service key is only required server-side
  const serverOnlyRequiredVariables = [
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: supabaseConfig.serviceKey },
  ];

  let requiredVariables = commonRequiredVariables;
  // Check if running on the server (Node.js environment)
  if (typeof window === 'undefined') {
    requiredVariables = requiredVariables.concat(serverOnlyRequiredVariables);
  }

  const missingVariables = requiredVariables
    .filter(v => !v.value)
    .map(v => v.name);

  if (missingVariables.length > 0) {
    // Use console.error for potentially critical missing variables
    console.error(`[config.ts] Missing required environment variables: ${missingVariables.join(', ')}`);
    // In a production server environment, you might want to throw an error
    if (isProduction && typeof window === 'undefined') {
      // throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
      console.error("CRITICAL: Production server is missing required environment variables!");
    }
  } else {
    console.log("[config.ts] Required environment variables validated.");
  }

  return missingVariables.length === 0;
}

// Validate config immediately if not in test environment
if (!isTest) {
  validateConfig();
}

// Log the final API configuration being used at runtime
console.log(`[config.ts] Runtime API configured with baseUrl: ${apiConfig.baseUrl}`);
