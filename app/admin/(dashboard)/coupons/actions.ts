'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { couponSchema } from '@/lib/admin/validation';
import { fail, zodFieldErrors, str, optStr, num, bool, strList, type FormState } from '@/lib/admin/form';
import type { CouponType } from '@/config/constants';

const PATH = '/admin/coupons';
const PERM = 'manage_coupons' as const;

function toIso(v?: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function parse(fd: FormData) {
  return couponSchema.safeParse({
    code: str(fd, 'code'),
    type: str(fd, 'type'),
    value: num(fd, 'value'),
    min_order_amount: num(fd, 'min_order_amount') ?? 0,
    max_discount: num(fd, 'max_discount'),
    starts_at: toIso(optStr(fd, 'starts_at')),
    ends_at: toIso(optStr(fd, 'ends_at')),
    usage_limit: num(fd, 'usage_limit'),
    per_customer_limit: num(fd, 'per_customer_limit'),
    active: bool(fd, 'active'),
    product_ids: strList(fd, 'product_ids'),
    category_ids: strList(fd, 'category_ids'),
    brand_ids: strList(fd, 'brand_ids'),
  });
}

async function syncScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  couponId: string,
  productIds: string[],
  categoryIds: string[],
  brandIds: string[]
) {
  await supabase.from('coupon_products').delete().eq('coupon_id', couponId);
  await supabase.from('coupon_categories').delete().eq('coupon_id', couponId);
  await supabase.from('coupon_brands').delete().eq('coupon_id', couponId);
  if (productIds.length)
    await supabase.from('coupon_products').insert(productIds.map((product_id) => ({ coupon_id: couponId, product_id })));
  if (categoryIds.length)
    await supabase.from('coupon_categories').insert(categoryIds.map((category_id) => ({ coupon_id: couponId, category_id })));
  if (brandIds.length)
    await supabase.from('coupon_brands').insert(brandIds.map((brand_id) => ({ coupon_id: couponId, brand_id })));
}

function columns(data: Extract<ReturnType<typeof parse>, { success: true }>['data']) {
  const { product_ids: _p, category_ids: _c, brand_ids: _b, ...cols } = data;
  return { ...cols, code: cols.code.toUpperCase(), type: cols.type as CouponType };
}

export async function createCoupon(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));
  const supabase = await createClient();
  const { data, error } = await supabase.from('coupons').insert(columns(parsed.data)).select('id').single();
  if (error) return fail('تعذّر الحفظ. قد يكون الكود مستخدمًا بالفعل.');
  await syncScope(supabase, data.id, parsed.data.product_ids, parsed.data.category_ids, parsed.data.brand_ids);
  await logAction({ action: 'create', entity: 'coupons', entityId: data.id, next: columns(parsed.data) });
  revalidatePath(PATH);
  redirect(PATH);
}

export async function updateCoupon(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const id = str(fd, 'id');
  if (!id) return fail('معرّف غير صالح.');
  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: prev } = await supabase.from('coupons').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase.from('coupons').update(columns(parsed.data)).eq('id', id);
  if (error) return fail('تعذّر الحفظ. قد يكون الكود مستخدمًا بالفعل.');
  await syncScope(supabase, id, parsed.data.product_ids, parsed.data.category_ids, parsed.data.brand_ids);
  await logAction({ action: 'update', entity: 'coupons', entityId: id, previous: prev, next: columns(parsed.data) });
  revalidatePath(PATH);
  redirect(PATH);
}

export async function setCouponActive(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const active = bool(fd, 'active');
  const supabase = await createClient();
  await supabase.from('coupons').update({ active }).eq('id', id);
  await logAction({ action: active ? 'activate' : 'deactivate', entity: 'coupons', entityId: id });
  revalidatePath(PATH);
}

export async function deleteCoupon(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const supabase = await createClient();
  // used_count > 0 means it appears in historical orders (coupon_id there is
  // SET NULL on delete; coupon_usage cascades). We deactivate instead of delete
  // when it has been used, to preserve reporting.
  const { data: c } = await supabase.from('coupons').select('used_count').eq('id', id).maybeSingle();
  if (c && c.used_count > 0) {
    await supabase.from('coupons').update({ active: false }).eq('id', id);
    await logAction({ action: 'deactivate', entity: 'coupons', entityId: id, reason: 'used; deactivated instead of deleted' });
  } else {
    await supabase.from('coupons').delete().eq('id', id);
    await logAction({ action: 'delete', entity: 'coupons', entityId: id });
  }
  revalidatePath(PATH);
}
