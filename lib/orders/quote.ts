import { createClient } from '@/lib/supabase/server';
import type { Quote } from '@/types';
import type { QuoteInput } from '@/lib/validation/schemas';

/**
 * Read-only price quote for the checkout preview / coupon check.
 * Uses the anon-safe quote_order RPC (server recomputes everything).
 */
export async function getQuote(input: QuoteInput): Promise<Quote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('quote_order', {
    p_items: input.items,
    p_zone: input.delivery_zone_id,
    p_code: input.coupon_code,
    p_phone: input.phone,
  });
  if (error || !data) return null;
  return data as unknown as Quote;
}
