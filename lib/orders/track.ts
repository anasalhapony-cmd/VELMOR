import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { OrderPublic } from '@/types';

/**
 * Look up an order by public number + phone via the track_order RPC.
 * Returns null on any mismatch (no enumeration). The DB never exposes internal
 * fields. Rate limiting is applied by the calling API route; the RPC is NOT executable
 * with the anon key (0020), so this server-only client is the single entry point.
 */
export async function trackOrder(orderNumber: string, phone: string): Promise<OrderPublic | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('track_order', {
    p_number: orderNumber,
    p_phone: phone,
  });
  if (error || !data) return null;
  return data as unknown as OrderPublic;
}
