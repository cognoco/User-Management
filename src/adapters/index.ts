/**
 * Adapters Exports
 * 
 * This file exports all adapter related types and functions.
 * It provides a single entry point for importing adapters and registering factories.
 */

export * from './registry';
export * from './address';
export * from './admin';
export * from './api-keys';
export * from './audit';
export * from './auth';
export * from './company-notification';
export * from './consent';
export * from './csrf';
 // Server-only: data-export pulls email sending (nodemailer). Do not export in the browser bundle.
 // If needed on the server, import from 'src/adapters/data-export' directly.
 // export * from './data-export';
export * from './database';
export * from './gdpr';
export * from './notification';
export * from './oauth';
export * from './organization';
export * from './permission';
export * from './resource-relationship';
export * from './saved-search';
export * from './session';
export * from './sso';
export * from './storage';
export * from './subscription';
export * from './team';
export * from './two-factor';
export * from './user';
export * from './webhooks';


// Import and register the Supabase adapter factory by default
import { AdapterRegistry } from './registry';
import { createSupabaseAdapterFactory } from './supabase-factory';
import { createSupabaseDatabaseProvider } from './database/factory/supabase-factory';

// Register the Supabase adapter factory
AdapterRegistry.registerFactory('supabase', createSupabaseAdapterFactory);
AdapterRegistry.registerDatabaseFactory('supabase', createSupabaseDatabaseProvider);

// Re-export the registry instance for convenience
export { AdapterRegistry as default } from "./registry";
