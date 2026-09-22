'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { familySchema } from '@/lib/admin/validation';
import { fail, zodFieldErrors, str, optStr, num, bool, type FormState } from '@/lib/admin/form';

const PATH = '/admin/families';
const PERM = 'manage_products' as const;

function parse(fd: FormData) {
  return familySchema.safeParse({
    name: str(fd, 'name'),
    slug: str(fd, 'slug'),
    name_en: optStr(fd, 'name_en'),
    description: optStr(fd, 'description'),
    image_url: optStr(fd, 'image_url'),
    active: bool(fd, 'active'),
    sort_order: num(fd, 'sort_order') ?? 0,
  });
}

export async function createFamily(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fragrance_families')
    .insert({ ...parsed.data, slug: parsed.data.slug.toLowerCase() })
    .select('id')
    .single();
  if (error) return fail('تعذّر الحفظ. قد يكون الرابط مستخدمًا.');
  await logAction({ action: 'create', entity: 'fragrance_families', entityId: data.id, next: parsed.data });
  revalidatePath(PATH);
  redirect(PATH);
}

export async function updateFamily(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const id = str(fd, 'id');
  if (!id) return fail('معرّف غير صالح.');
  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: prev } = await supabase.from('fragrance_families').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase
    .from('fragrance_families')
    .update({ ...parsed.data, slug: parsed.data.slug.toLowerCase() })
    .eq('id', id);
  if (error) return fail('تعذّر الحفظ. قد يكون الرابط مستخدمًا.');
  await logAction({ action: 'update', entity: 'fragrance_families', entityId: id, previous: prev, next: parsed.data });
  revalidatePath(PATH);
  redirect(PATH);
}

export async function setFamilyActive(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const active = bool(fd, 'active');
  const supabase = await createClient();
  await supabase.from('fragrance_families').update({ active }).eq('id', id);
  await logAction({ action: active ? 'activate' : 'deactivate', entity: 'fragrance_families', entityId: id });
  revalidatePath(PATH);
}

export async function deleteFamily(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const supabase = await createClient();
  await supabase.from('fragrance_families').delete().eq('id', id);
  await logAction({ action: 'delete', entity: 'fragrance_families', entityId: id });
  revalidatePath(PATH);
}
