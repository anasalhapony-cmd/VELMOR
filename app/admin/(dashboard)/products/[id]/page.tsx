import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/forms/ProductForm';
import { VariantsSection } from '@/components/admin/products/VariantsSection';
import { NotesSection } from '@/components/admin/products/NotesSection';
import { ImagesSection } from '@/components/admin/products/ImagesSection';
import { updateProduct, setProductArchived } from '../actions';
import { NOTE_TIERS } from '@/config/constants';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('manage_products');
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (!product) notFound();

  const [
    { data: brands }, { data: families }, { data: cats }, { data: cols },
    { data: pc }, { data: pcol }, { data: variants }, { data: images },
    { data: allNotes }, { data: prodNotes },
  ] = await Promise.all([
    supabase.from('brands').select('id, name').order('name'),
    supabase.from('fragrance_families').select('id, name').order('name'),
    supabase.from('categories').select('id, name').order('name'),
    supabase.from('collections').select('id, name').order('name'),
    supabase.from('product_categories').select('category_id').eq('product_id', id),
    supabase.from('product_collections').select('collection_id').eq('product_id', id),
    supabase.from('product_variants').select('*').eq('product_id', id).order('position', { ascending: true }),
    supabase.from('product_images').select('*').eq('product_id', id).order('sort_order', { ascending: true }),
    supabase.from('fragrance_notes').select('id, name').order('name'),
    supabase.from('product_notes').select('note_id, tier').eq('product_id', id),
  ]);

  const selectedNotes = { TOP: [] as string[], HEART: [] as string[], BASE: [] as string[] };
  for (const pn of prodNotes ?? []) {
    if (NOTE_TIERS.includes(pn.tier)) selectedNotes[pn.tier].push(pn.note_id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name_ar || product.name}
        description="تعديل بيانات المنتج والمقاسات والصور والنوتات."
        backHref="/admin/products"
        action={
          <div className="flex items-center gap-2">
            <Link href={`/products/${product.slug}`} target="_blank" className="admin-btn-sm">
              <ExternalLink size={14} /> عرض
            </Link>
            <form action={setProductArchived}>
              <input type="hidden" name="id" value={product.id} />
              <input type="hidden" name="archived" value={product.archived ? '' : 'on'} />
              <button type="submit" className="admin-btn-sm">
                {product.archived ? 'إلغاء الأرشفة' : 'أرشفة'}
              </button>
            </form>
          </div>
        }
      />

      <ProductForm
        action={updateProduct}
        defaults={product}
        brands={(brands ?? []).map((b) => ({ value: b.id, label: b.name }))}
        families={(families ?? []).map((f) => ({ value: f.id, label: f.name }))}
        categories={(cats ?? []).map((c) => ({ value: c.id, label: c.name }))}
        collections={(cols ?? []).map((c) => ({ value: c.id, label: c.name }))}
        selectedCategories={(pc ?? []).map((r) => r.category_id)}
        selectedCollections={(pcol ?? []).map((r) => r.collection_id)}
      />

      <VariantsSection productId={id} variants={variants ?? []} />
      <NotesSection productId={id} allNotes={(allNotes ?? []).map((n) => ({ value: n.id, label: n.name }))} selected={selectedNotes} />
      <ImagesSection productId={id} images={images ?? []} />
    </div>
  );
}
