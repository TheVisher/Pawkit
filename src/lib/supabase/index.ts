/**
 * Supabase Index
 * Re-exports for clean imports
 */

export { createClient, getClient } from './client';
export { createClient as createServerClient, createAdminClient } from './server';
export { updateSession } from './middleware';
