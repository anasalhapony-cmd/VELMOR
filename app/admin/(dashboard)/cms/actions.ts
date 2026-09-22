'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { pageSchema, faqSchema, cmsBlockSchema } from '@/lib/admin/validation';
import { fail, zodFieldErrors, str, optStr, num, bool, type FormState } from '@/lib/admin/form';

const PERM = 'manage_cms' as const;

function toIso(v?: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// ---- Homepage sections -----------------------------------------------------
export async function updateSection(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const supabase = await createClient();
  await supabase
    .from('homepage_sections')
    .update({ active: bool(fd, 'active'), sort_order: num(fd, 'sort_order') ?? 0, title: str(fd, 'title') })
    .eq('id', id);
  await logAction({ action: 'update', entity: 'homepage_sections', entityId: id });
  revalidatePath('/admin/cms');
  revalidatePath('/');
}

// ---- Pages (§112 approval) -------------------------------------------------
export async function savePage(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const parsed = pageSchema.safeParse({
    slug: str(fd, 'slug'),
    title: str(fd, 'title'),
    body: str(fd, 'body'),
    is_placeholder: bool(fd, 'is_placeholder'),
    approved: bool(fd, 'approved'),
    noindex: bool(fd, 'noindex'),
    active: bool(fd, 'active'),
    seo_title: optStr(fd, 'seo_title'),
    seo_description: optStr(fd, 'seo_description'),
  });
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase
    .from('pages')
    .upsert({ ...parsed.data, slug: parsed.data.slug.toLowerCase() }, { onConflict: 'slug' });
  if (error) return fail('تعذّر الحفظ.');
  await logAction({ action: 'upsert', entity: 'pages', entityId: parsed.data.slug, next: parsed.data });
  revalidatePath('/admin/cms/pages');
  redirect('/admin/cms/pages');
}

export async function deletePage(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const slug = str(fd, 'slug');
  const supabase = await createClient();
  await supabase.from('pages').delete().eq('slug', slug);
  await logAction({ action: 'delete', entity: 'pages', entityId: slug });
  revalidatePath('/admin/cms/pages');
}

// ---- FAQ -------------------------------------------------------------------
export async function saveFaq(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const parsed = faqSchema.safeParse({
    question: str(fd, 'question'),
    answer: str(fd, 'answer'),
    active: bool(fd, 'active'),
    sort_order: num(fd, 'sort_order') ?? 0,
  });
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));
  const id = optStr(fd, 'id');
  const supabase = await createClient();
  if (id) {
    await supabase.from('faqs').update(parsed.data).eq('id', id);
    await logAction({ action: 'update', entity: 'faqs', entityId: id, next: parsed.data });
  } else {
    await supabase.from('faqs').insert(parsed.data);
    await logAction({ action: 'create', entity: 'faqs', next: parsed.data });
  }
  revalidatePath('/admin/cms/faq');
  redirect('/admin/cms/faq');
}

export async function deleteFaq(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const supabase = await createClient();
  await supabase.from('faqs').delete().eq('id', id);
  await logAction({ action: 'delete', entity: 'faqs', entityId: id });
  revalidatePath('/admin/cms/faq');
}

// ---- Content blocks --------------------------------------------------------
export async function saveBlock(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية.');
  const parsed = cmsBlockSchema.safeParse({
    section_key: str(fd, 'section_key'),
    title: optStr(fd, 'title'),
    subtitle: optStr(fd, 'subtitle'),
    body: optStr(fd, 'body'),
    image_url: optStr(fd, 'image_url'),
    cta_label: optStr(fd, 'cta_label'),
    cta_href: optStr(fd, 'cta_href'),
    active: bool(fd, 'active'),
    sort_order: num(fd, 'sort_order') ?? 0,
    starts_at: toIso(optStr(fd, 'starts_at')),
    ends_at: toIso(optStr(fd, 'ends_at')),
  });
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));
  const id = optStr(fd, 'id');
  const supabase = await createClient();
  if (id) {
    await supabase.from('cms_blocks').update(parsed.data).eq('id', id);
    await logAction({ action: 'update', entity: 'cms_blocks', entityId: id, next: parsed.data });
  } else {
    await supabase.from('cms_blocks').insert(parsed.data);
    await logAction({ action: 'create', entity: 'cms_blocks', next: parsed.data });
  }
  revalidatePath('/admin/cms/blocks');
  redirect('/admin/cms/blocks');
}

export async function deleteBlock(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const supabase = await createClient();
  await supabase.from('cms_blocks').delete().eq('id', id);
  await logAction({ action: 'delete', entity: 'cms_blocks', entityId: id });
  revalidatePath('/admin/cms/blocks');
}
