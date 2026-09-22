'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { productSchema } from '@/lib/admin/validation';
import { fail, zodFieldErrors, str, optStr, num, bool, strList, type FormState } from '@/lib/admin/form';

const PATH = '/admin/products';
const PERM = 'manage_products' as const;

function parse(fd: FormData) {
  return productSchema.safeParse({
    name: str(fd, 'name'),
    name_ar: optStr(fd, 'name_ar'),
    slug: str(fd, 'slug'),
    brand_id: optStr(fd, 'brand_id'),
    family_id: optStr(fd, 'family_id'),
    gender: optStr(fd, 'gender'),
    concentration: optStr(fd, 'concentration'),
    season: optStr(fd, 'season'),
    occasions: strList(fd, 'occasions'),
    short_description: optStr(fd, 'short_description'),
    description: optStr(fd, 'description'),
    longevity: num(fd, 'longevity'),
    sillage: num(fd, 'sillage'),
    video_url: optStr(fd, 'video_url'),
    is_featured: bool(fd, 'is_featured'),
    is_new_arrival: bool(fd, 'is_new_arrival'),
    is_best_seller: bool(fd, 'is_best_seller'),
    active: bool(fd, 'active'),
    archived: bool(fd, 'archived'),
    sort_order: num(fd, 'sort_order') ?? 0,
    seo_title: optStr(fd, 'seo_title'),
    seo_description: optStr(fd, 'seo_description'),
    og_image_url: optStr(fd, 'og_image_url'),
    category_ids: strList(fd, 'category_ids'),
    collection_ids: strList(fd, 'collection_ids'),
  });
}

type ProductFields = ReturnType<typeof parse>;

/** Strip the join-only arrays to get the columns that belong on `products`. */
function productColumns(data: Extract<ProductFields, { success: true }>['data']) {
  const { category_ids: _c, collection_ids: _col, ...cols } = data;
  return { ...cols, slug: cols.slug.toLowerCase() };
}

async function syncJoins(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  categoryIds: string[],
  collectionIds: string[]
) {
  await supabase.from('product_categories').delete().eq('product_id', productId);
  await supabase.from('product_collections').delete().eq('product_id', productId);
  if (categoryIds.length) {
    await supabase
      .from('product_categories')
      .insert(categoryIds.map((category_id) => ({ product_id: productId, category_id })));
  }
  if (collectionIds.length) {
    await supabase
      .from('product_collections')
      .insert(collectionIds.map((collection_id) => ({ product_id: productId, collection_id })));
  }
}

export async function createProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية إدارة المنتجات.');
  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .insert(productColumns(parsed.data))
    .select('id')
    .single();
  if (error) return fail('تعذّر الحفظ. قد يكون الرابط (slug) مستخدمًا بالفعل.');

  await syncJoins(supabase, data.id, parsed.data.category_ids, parsed.data.collection_ids);
  await logAction({ action: 'create', entity: 'products', entityId: data.id, next: productColumns(parsed.data) });
  revalidatePath(PATH);
  redirect(`${PATH}/${data.id}`);
}

export async function updateProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية إدارة المنتجات.');
  const id = str(fd, 'id');
  if (!id) return fail('معرّف غير صالح.');
  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { data: prev } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase.from('products').update(productColumns(parsed.data)).eq('id', id);
  if (error) return fail('تعذّر الحفظ. قد يكون الرابط (slug) مستخدمًا بالفعل.');

  await syncJoins(supabase, id, parsed.data.category_ids, parsed.data.collection_ids);
  await logAction({ action: 'update', entity: 'products', entityId: id, previous: prev, next: productColumns(parsed.data) });
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${id}`);
  return { ok: true, message: 'تم حفظ المنتج.' };
}

export async function setProductArchived(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const archived = bool(fd, 'archived');
  const supabase = await createClient();
  // Archiving also removes it from the storefront (active=false) for safety.
  await supabase.from('products').update({ archived, active: archived ? false : true }).eq('id', id);
  await logAction({ action: archived ? 'archive' : 'unarchive', entity: 'products', entityId: id });
  revalidatePath(PATH);
}
