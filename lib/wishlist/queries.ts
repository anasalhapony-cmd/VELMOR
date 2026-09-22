import { createAdminClient } from '@/lib/supabase/admin';
import { toProductCard } from '@/lib/products/mappers';
import type { ProductCard } from '@/types';

const CARD_SELECT = `
  id, slug, name, name_ar, gender, is_new_arrival, is_best_seller, is_featured,
  rating_avg, rating_count,
  brands ( name ),
  product_images ( url, alt, is_primary, sort_order ),
  product_variants ( id, size, unit, price, compare_at_price, active, stock_status, position )
`;

/** Product cards for a device's wishlist. */
export async function getWishlist(deviceId: string): Promise<ProductCard[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('wishlist_items')
    .select(`product_id, products!inner ( ${CARD_SELECT} )`)
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false });
  const cards: ProductCard[] = [];
  for (const row of data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (row as any).products;
    const prod = Array.isArray(p) ? p[0] : p;
    if (prod && prod.active !== false) cards.push(toProductCard(prod));
  }
  return cards;
}

/** Just the wishlisted product ids for a device (for client hydration). */
export async function getWishlistIds(deviceId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('wishlist_items').select('product_id').eq('device_id', deviceId);
  return (data ?? []).map((r) => r.product_id);
}

export async function addToWishlist(deviceId: string, productId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('wishlist_items').upsert(
    { device_id: deviceId, product_id: productId },
    { onConflict: 'device_id,product_id', ignoreDuplicates: true }
  );
}

export async function removeFromWishlist(deviceId: string, productId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('wishlist_items').delete().eq('device_id', deviceId).eq('product_id', productId);
}
