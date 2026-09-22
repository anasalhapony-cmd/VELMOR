'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { brandSchema } from '@/lib/admin/validation';
import { fail, zodFieldErrors, str, optStr, num, bool, type FormState } from '@/lib/admin/form';

const PATH = '/admin/brands';

function parse(fd: FormData) {
  return brandSchema.safeParse({
    name: str(fd, 'name'),
    slug: str(fd, 'slug'),
    name_en: optStr(fd, 'name_en'),
    description: optStr(fd, 'description'),
    logo_url: optStr(fd, 'logo_url'),
    image_url: optStr(fd, 'image_url'),
    seo_title: optStr(fd, 'seo_title'),
    seo_description: optStr(fd, 'seo_description'),
    active: bool(fd, 'active'),
    sort_order: num(fd, 'sort_order') ?? 0,
  });
}

export async function createBrand(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor('manage_products');
  if (!me) return fail('ليست لديك صلاحية إدارة المنتجات.');

  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('brands')
    .insert({ ...parsed.data, slug: parsed.data.slug.toLowerCase() })
    .select('id')
    .single();
  if (error) return fail('تعذّر الحفظ. قد يكون الرابط (slug) مستخدمًا بالفعل.');

  await logAction({ action: 'create', entity: 'brands', entityId: data.id, next: parsed.data });
  revalidatePath(PATH);
  redirect(PATH);
}

export async function updateBrand(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor('manage_products');
  if (!me) return fail('ليست لديك صلاحية إدارة المنتجات.');
  const id = str(fd, 'id');
  if (!id) return fail('معرّف غير صالح.');

  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { data: prev } = await supabase.from('brands').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase
    .from('brands')
    .update({ ...parsed.data, slug: parsed.data.slug.toLowerCase() })
    .eq('id', id);
  if (error) return fail('تعذّر الحفظ. قد يكون الرابط (slug) مستخدمًا بالفعل.');

  await logAction({ action: 'update', entity: 'brands', entityId: id, previous: prev, next: parsed.data });
  revalidatePath(PATH);
  redirect(PATH);
}

export async function setBrandActive(fd: FormData): Promise<void> {
  const me = await permittedActor('manage_products');
  if (!me) return;
  const id = str(fd, 'id');
  const active = bool(fd, 'active');
  const supabase = await createClient();
  await supabase.from('brands').update({ active }).eq('id', id);
  await logAction({ action: active ? 'activate' : 'deactivate', entity: 'brands', entityId: id });
  revalidatePath(PATH);
}

export async function deleteBrand(fd: FormData): Promise<void> {
  const me = await permittedActor('manage_products');
  if (!me) return;
  const id = str(fd, 'id');
  const supabase = await createClient();
  await supabase.from('brands').delete().eq('id', id);
  await logAction({ action: 'delete', entity: 'brands', entityId: id });
  revalidatePath(PATH);
}
