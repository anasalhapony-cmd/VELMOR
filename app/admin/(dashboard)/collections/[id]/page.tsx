import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { CollectionForm } from '@/components/admin/forms/CollectionForm';
import { updateCollection } from '../actions';

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('manage_products');
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase.from('collections').select('*').eq('id', id).maybeSingle();
  if (!row) notFound();
  return (
    <div>
      <PageHeader title={`تعديل: ${row.name}`} backHref="/admin/collections" />
      <CollectionForm action={updateCollection} defaults={row} />
    </div>
  );
}
