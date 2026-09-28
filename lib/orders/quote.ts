import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Quote } from '@/types';
import type { QuoteInput } from '@/lib/validation/schemas';

/**
 * Read-only price quote for the checkout preview / coupon check.
 * Uses quote_order_v2 through the server-only client (the RPC is not exposed
 * to the anon key since 0020, so it can't be probed around our rate limits) (server recomputes everything,
 * including the gift-wrap fee when that feature is enabled).
 */
export async function getQuote(input: QuoteInput): Promise<Quote | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('quote_order_v2', {
    p_payload: {
      items: input.items,
      delivery_zone_id: input.delivery_zone_id ?? null,
      coupon_code: input.coupon_code ?? null,
      phone: input.phone ?? null,
      gift_wrap: input.gift_wrap ?? false,
    },
  });
  if (error || !data) return null;
  return data as unknown as Quote;
}
