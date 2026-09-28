'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { str, optStr, bool } from '@/lib/admin/form';

const PERM = 'manage_products' as const;

export async function addProductImage(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const productId = str(fd, 'product_id');
  const url = str(fd, 'url');
  const alt = optStr(fd, 'alt') ?? null;
  const makePrimary = bool(fd, 'is_primary');
  if (!productId || !url) return;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('product_images')
    .select('id, sort_order, is_primary')
    .eq('product_id', productId)
    .order('sort_order', { ascending: false });

  const nextSort = existing && existing.length ? (existing[0]!.sort_order ?? 0) + 1 : 0;
  const hasPrimary = (existing ?? []).some((i) => i.is_primary);
  const primary = makePrimary || !hasPrimary; // first image becomes primary automatically

  if (primary && hasPrimary) {
    await supabase.from('product_images').update({ is_primary: false }).eq('product_id', productId);
  }
  await supabase
    .from('product_images')
    .insert({ product_id: productId, url, alt, is_primary: primary, sort_order: nextSort });
  await logAction({ action: 'add_image', entity: 'products', entityId: productId, next: { url } });
  revalidatePath(`/admin/products/${productId}`);
}

export async function setPrimaryImage(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const productId = str(fd, 'product_id');
  const id = str(fd, 'id');
  const supabase = await createClient();
  await supabase.from('product_images').update({ is_primary: false }).eq('product_id', productId);
  await supabase.from('product_images').update({ is_primary: true }).eq('id', id);
  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteProductImage(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const productId = str(fd, 'product_id');
  const id = str(fd, 'id');
  const supabase = await createClient();
  const { data: img } = await supabase.from('product_images').select('is_primary').eq('id', id).maybeSingle();
  await supabase.from('product_images').delete().eq('id', id);
  // If we removed the primary, promote the next image to primary.
  if (img?.is_primary) {
    const { data: next } = await supabase
      .from('product_images')
      .select('id')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) await supabase.from('product_images').update({ is_primary: true }).eq('id', next.id);
  }
  await logAction({ action: 'delete_image', entity: 'products', entityId: productId });
  revalidatePath(`/admin/products/${productId}`);
}
