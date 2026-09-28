'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { fail, str, strList, type FormState } from '@/lib/admin/form';
import { NOTE_TIERS } from '@/config/constants';

const PERM = 'manage_products' as const;

/**
 * Replace the full set of fragrance notes for a product. Fields:
 *   notes_TOP[], notes_HEART[], notes_BASE[]  (note ids, ordered).
 */
export async function setProductNotes(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const productId = str(fd, 'product_id');
  if (!productId) return fail('معرّف المنتج غير صالح.');

  const rows: { product_id: string; note_id: string; tier: string; position: number }[] = [];
  for (const tier of NOTE_TIERS) {
    const ids = strList(fd, `notes_${tier}`);
    ids.forEach((note_id, position) => {
      // A note can only appear once per (product, note, tier) — dedupe defensively.
      if (!rows.some((r) => r.note_id === note_id && r.tier === tier)) {
        rows.push({ product_id: productId, note_id, tier, position });
      }
    });
  }

  const supabase = await createClient();
  await supabase.from('product_notes').delete().eq('product_id', productId);
  if (rows.length) {
    const { error } = await supabase.from('product_notes').insert(rows);
    if (error) return fail('تعذّر حفظ النوتات.');
  }
  await logAction({ action: 'set_notes', entity: 'products', entityId: productId, next: { count: rows.length } });
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true, message: 'تم حفظ النوتات العطرية.' };
}
