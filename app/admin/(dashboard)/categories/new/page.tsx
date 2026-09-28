import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { CategoryForm } from '@/components/admin/forms/CategoryForm';
import { createCategory } from '../actions';

export default async function NewCategoryPage() {
  await requirePermission('manage_products');
  const supabase = await createClient();
  const { data: cats } = await supabase.from('categories').select('id, name').order('name');
  const parents = (cats ?? []).map((c) => ({ value: c.id, label: c.name }));
  return (
    <div>
      <PageHeader title="تصنيف جديد" backHref="/admin/categories" />
      <CategoryForm action={createCategory} parents={parents} />
    </div>
  );
}
