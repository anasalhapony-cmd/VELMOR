import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { FamilyForm } from '@/components/admin/forms/FamilyForm';
import { updateFamily } from '../actions';

export default async function EditFamilyPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('manage_products');
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase.from('fragrance_families').select('*').eq('id', id).maybeSingle();
  if (!row) notFound();
  return (
    <div>
      <PageHeader title={`تعديل: ${row.name}`} backHref="/admin/families" />
      <FamilyForm action={updateFamily} defaults={row} />
    </div>
  );
}
