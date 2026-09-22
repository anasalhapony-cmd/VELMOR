'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { variantSchema } from '@/lib/admin/validation';
import { fail, zodFieldErrors, str, optStr, num, bool, type FormState } from '@/lib/admin/form';

const PERM = 'manage_products' as const;

function parse(fd: FormData) {
  return variantSchema.safeParse({
    size: num(fd, 'size'),
    unit: str(fd, 'unit') || 'ml',
    sku: optStr(fd, 'sku'),
    barcode: optStr(fd, 'barcode'),
    price: num(fd, 'price'),
    compare_at_price: num(fd, 'compare_at_price'),
    stock_quantity: num(fd, 'stock_quantity') ?? 0,
    weight_grams: num(fd, 'weight_grams'),
    active: bool(fd, 'active'),
    position: num(fd, 'position') ?? 0,
  });
}

/** New variant: stock_quantity is the opening balance (set directly). Later
 *  changes must go through the Inventory screen so the ledger stays complete. */
export async function createVariant(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const productId = str(fd, 'product_id');
  if (!productId) return fail('معرّف المنتج غير صالح.');
  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_variants')
    .insert({ ...parsed.data, product_id: productId })
    .select('id')
    .single();
  if (error) return fail('تعذّر الحفظ. تحقّق من عدم تكرار المقاس أو SKU.');
  await logAction({ action: 'create', entity: 'product_variants', entityId: data.id, next: parsed.data });
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true, message: 'تمت إضافة المقاس.' };
}

/** Edit a variant — everything EXCEPT stock_quantity (ledger-controlled). */
export async function updateVariant(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const id = str(fd, 'id');
  const productId = str(fd, 'product_id');
  if (!id) return fail('معرّف غير صالح.');
  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));

  const { stock_quantity: _ignore, ...editable } = parsed.data;
  const supabase = await createClient();
  const { data: prev } = await supabase.from('product_variants').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase.from('product_variants').update(editable).eq('id', id);
  if (error) return fail('تعذّر الحفظ. تحقّق من عدم تكرار المقاس أو SKU.');
  await logAction({ action: 'update', entity: 'product_variants', entityId: id, previous: prev, next: editable });
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true, message: 'تم حفظ المقاس.' };
}

export async function setVariantActive(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const productId = str(fd, 'product_id');
  const active = bool(fd, 'active');
  const supabase = await createClient();
  await supabase.from('product_variants').update({ active }).eq('id', id);
  await logAction({ action: active ? 'activate' : 'deactivate', entity: 'product_variants', entityId: id });
  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteVariant(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const productId = str(fd, 'product_id');
  const supabase = await createClient();
  await supabase.from('product_variants').delete().eq('id', id);
  await logAction({ action: 'delete', entity: 'product_variants', entityId: id });
  revalidatePath(`/admin/products/${productId}`);
}
