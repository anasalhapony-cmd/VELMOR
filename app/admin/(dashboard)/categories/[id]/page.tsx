import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { CategoryForm } from '@/components/admin/forms/CategoryForm';
import { updateCategory } from '../actions';

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('manage_products');
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: row }, { data: cats }] = await Promise.all([
    supabase.from('categories').select('*').eq('id', id).maybeSingle(),
    supabase.from('categories').select('id, name').order('name'),
  ]);
  if (!row) notFound();
  // Exclude self from the parent options.
  const parents = (cats ?? []).filter((c) => c.id !== id).map((c) => ({ value: c.id, label: c.name }));
  return (
    <div>
      <PageHeader title={`تعديل: ${row.name}`} backHref="/admin/categories" />
      <CategoryForm action={updateCategory} defaults={row} parents={parents} />
    </div>
  );
}
