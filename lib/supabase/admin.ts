import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Service-role Supabase client — BYPASSES RLS.
 *
 * SECURITY: this may only ever run on the server. The `server-only` import
 * above makes the build fail if this module is ever pulled into a client
 * bundle. It is used for a narrow set of privileged, server-validated
 * operations: atomic order creation, inventory movements, and admin mutations
 * that are already guarded by an authorization check.
 *
 * The key is read from SUPABASE_SERVICE_ROLE_KEY (never NEXT_PUBLIC_*).
 */
let cached: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase server credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).'
    );
  }
  if (cached) return cached;
  cached = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
