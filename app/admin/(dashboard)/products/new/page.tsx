import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/forms/ProductForm';
import { createProduct } from '../actions';

export default async function NewProductPage() {
  await requirePermission('manage_products');
  const supabase = await createClient();
  const [{ data: brands }, { data: families }, { data: cats }, { data: cols }] = await Promise.all([
    supabase.from('brands').select('id, name').order('name'),
    supabase.from('fragrance_families').select('id, name').order('name'),
    supabase.from('categories').select('id, name').order('name'),
    supabase.from('collections').select('id, name').order('name'),
  ]);

  return (
    <div>
      <PageHeader title="منتج جديد" description="بعد الإنشاء يمكنك إضافة المقاسات والصور والنوتات." backHref="/admin/products" />
      <ProductForm
        action={createProduct}
        brands={(brands ?? []).map((b) => ({ value: b.id, label: b.name }))}
        families={(families ?? []).map((f) => ({ value: f.id, label: f.name }))}
        categories={(cats ?? []).map((c) => ({ value: c.id, label: c.name }))}
        collections={(cols ?? []).map((c) => ({ value: c.id, label: c.name }))}
      />
    </div>
  );
}
