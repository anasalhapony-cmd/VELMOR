'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { deliveryZoneSchema } from '@/lib/admin/validation';
import { fail, zodFieldErrors, str, optStr, num, bool, type FormState } from '@/lib/admin/form';

const PATH = '/admin/delivery';
const PERM = 'manage_delivery' as const;

function parse(fd: FormData) {
  return deliveryZoneSchema.safeParse({
    name: str(fd, 'name'),
    city: str(fd, 'city'),
    area: optStr(fd, 'area'),
    fee: num(fd, 'fee') ?? 0,
    active: bool(fd, 'active'),
    sort_order: num(fd, 'sort_order') ?? 0,
  });
}

export async function createZone(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));
  const supabase = await createClient();
  const { data, error } = await supabase.from('delivery_zones').insert(parsed.data).select('id').single();
  if (error) return fail('تعذّر الحفظ.');
  await logAction({ action: 'create', entity: 'delivery_zones', entityId: data.id, next: parsed.data });
  revalidatePath(PATH);
  redirect(PATH);
}

export async function updateZone(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const id = str(fd, 'id');
  if (!id) return fail('معرّف غير صالح.');
  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: prev } = await supabase.from('delivery_zones').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase.from('delivery_zones').update(parsed.data).eq('id', id);
  if (error) return fail('تعذّر الحفظ.');
  await logAction({ action: 'update', entity: 'delivery_zones', entityId: id, previous: prev, next: parsed.data });
  revalidatePath(PATH);
  redirect(PATH);
}

export async function setZoneActive(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const active = bool(fd, 'active');
  const supabase = await createClient();
  await supabase.from('delivery_zones').update({ active }).eq('id', id);
  await logAction({ action: active ? 'activate' : 'deactivate', entity: 'delivery_zones', entityId: id });
  revalidatePath(PATH);
}

export async function deleteZone(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const supabase = await createClient();
  await supabase.from('delivery_zones').delete().eq('id', id);
  await logAction({ action: 'delete', entity: 'delivery_zones', entityId: id });
  revalidatePath(PATH);
}
