import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { ZoneForm } from '@/components/admin/forms/ZoneForm';
import { updateZone } from '../actions';

export default async function EditZonePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('manage_delivery');
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase.from('delivery_zones').select('*').eq('id', id).maybeSingle();
  if (!row) notFound();
  return (
    <div>
      <PageHeader title={`تعديل: ${row.name}`} backHref="/admin/delivery" />
      <ZoneForm action={updateZone} defaults={row} />
    </div>
  );
}
