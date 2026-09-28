import 'server-only';
import { createClient } from '@/lib/supabase/server';

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

export interface AuditEntry {
  action: string; // create | update | delete | archive | status_change | approve | …
  entity: string; // table / domain name
  entityId?: string | null;
  previous?: Json;
  next?: Json;
  reason?: string | null;
}

/**
 * Append an admin audit record via the SECURITY DEFINER log_admin_action RPC
 * (admin_audit_logs has no INSERT policy by design). Best-effort: an audit
 * failure must never break the underlying admin operation, but it is logged.
 */
export async function logAction(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('log_admin_action', {
      p_action: entry.action,
      p_entity: entry.entity,
      p_entity_id: entry.entityId ?? null,
      p_previous: (entry.previous ?? null) as never,
      p_new: (entry.next ?? null) as never,
      p_reason: entry.reason ?? null,
    });
    if (error) console.error('[audit] failed to log action', entry.action, entry.entity, error.message);
  } catch (err) {
    console.error('[audit] unexpected error', err);
  }
}
