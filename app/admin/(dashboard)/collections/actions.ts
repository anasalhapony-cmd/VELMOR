'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { collectionSchema } from '@/lib/admin/validation';
import { fail, zodFieldErrors, str, optStr, num, bool, type FormState } from '@/lib/admin/form';

const PATH = '/admin/collections';
const PERM = 'manage_products' as const;

function parse(fd: FormData) {
  return collectionSchema.safeParse({
    name: str(fd, 'name'),
    slug: str(fd, 'slug'),
    name_en: optStr(fd, 'name_en'),
    description: optStr(fd, 'description'),
    image_url: optStr(fd, 'image_url'),
    seo_title: optStr(fd, 'seo_title'),
    seo_description: optStr(fd, 'seo_description'),
    is_seasonal: bool(fd, 'is_seasonal'),
    active: bool(fd, 'active'),
    sort_order: num(fd, 'sort_order') ?? 0,
  });
}

export async function createCollection(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('collections')
    .insert({ ...parsed.data, slug: parsed.data.slug.toLowerCase() })
    .select('id')
    .single();
  if (error) return fail('تعذّر الحفظ. قد يكون الرابط مستخدمًا.');
  await logAction({ action: 'create', entity: 'collections', entityId: data.id, next: parsed.data });
  revalidatePath(PATH);
  redirect(PATH);
}

export async function updateCollection(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const id = str(fd, 'id');
  if (!id) return fail('معرّف غير صالح.');
  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: prev } = await supabase.from('collections').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase
    .from('collections')
    .update({ ...parsed.data, slug: parsed.data.slug.toLowerCase() })
    .eq('id', id);
  if (error) return fail('تعذّر الحفظ. قد يكون الرابط مستخدمًا.');
  await logAction({ action: 'update', entity: 'collections', entityId: id, previous: prev, next: parsed.data });
  revalidatePath(PATH);
  redirect(PATH);
}

export async function setCollectionActive(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const active = bool(fd, 'active');
  const supabase = await createClient();
  await supabase.from('collections').update({ active }).eq('id', id);
  await logAction({ action: active ? 'activate' : 'deactivate', entity: 'collections', entityId: id });
  revalidatePath(PATH);
}

export async function deleteCollection(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const supabase = await createClient();
  await supabase.from('collections').delete().eq('id', id);
  await logAction({ action: 'delete', entity: 'collections', entityId: id });
  revalidatePath(PATH);
}
