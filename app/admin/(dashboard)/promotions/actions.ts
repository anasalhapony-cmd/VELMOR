'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { promotionSchema } from '@/lib/admin/validation';
import { fail, zodFieldErrors, str, optStr, num, bool, type FormState } from '@/lib/admin/form';

const PATH = '/admin/promotions';
const PERM = 'manage_coupons' as const;

function toIso(v?: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function build(fd: FormData): { ok: true; data: Record<string, unknown> } | { ok: false; state: FormState } {
  const parsed = promotionSchema.safeParse({
    title: str(fd, 'title'),
    kind: str(fd, 'kind') || 'SALE',
    config: optStr(fd, 'config'),
    starts_at: toIso(optStr(fd, 'starts_at')),
    ends_at: toIso(optStr(fd, 'ends_at')),
    active: bool(fd, 'active'),
    sort_order: num(fd, 'sort_order') ?? 0,
  });
  if (!parsed.success) return { ok: false, state: fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error)) };

  let config: unknown = {};
  if (parsed.data.config) {
    try {
      config = JSON.parse(parsed.data.config);
    } catch {
      return { ok: false, state: fail('حقل الإعدادات ليس JSON صالحًا.', { config: 'JSON غير صالح' }) };
    }
  }
  const { config: _c, ...rest } = parsed.data;
  return { ok: true, data: { ...rest, config } };
}

export async function createPromotion(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const b = build(fd);
  if (!b.ok) return b.state;
  const supabase = await createClient();
  const { data, error } = await supabase.from('promotions').insert(b.data).select('id').single();
  if (error) return fail('تعذّر الحفظ.');
  await logAction({ action: 'create', entity: 'promotions', entityId: data.id, next: b.data });
  revalidatePath(PATH);
  redirect(PATH);
}

export async function updatePromotion(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const id = str(fd, 'id');
  if (!id) return fail('معرّف غير صالح.');
  const b = build(fd);
  if (!b.ok) return b.state;
  const supabase = await createClient();
  const { data: prev } = await supabase.from('promotions').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase.from('promotions').update(b.data).eq('id', id);
  if (error) return fail('تعذّر الحفظ.');
  await logAction({ action: 'update', entity: 'promotions', entityId: id, previous: prev, next: b.data });
  revalidatePath(PATH);
  redirect(PATH);
}

export async function setPromotionActive(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const active = bool(fd, 'active');
  const supabase = await createClient();
  await supabase.from('promotions').update({ active }).eq('id', id);
  await logAction({ action: active ? 'activate' : 'deactivate', entity: 'promotions', entityId: id });
  revalidatePath(PATH);
}

export async function deletePromotion(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const supabase = await createClient();
  await supabase.from('promotions').delete().eq('id', id);
  await logAction({ action: 'delete', entity: 'promotions', entityId: id });
  revalidatePath(PATH);
}
