import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { BlockForm } from '@/components/admin/forms/BlockForm';
import { saveBlock } from '../../actions';

export default async function EditBlockPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('manage_cms');
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase.from('cms_blocks').select('*').eq('id', id).maybeSingle();
  if (!row) notFound();
  return (
    <div>
      <PageHeader title="تعديل الكتلة" backHref="/admin/cms/blocks" />
      <BlockForm action={saveBlock} defaults={row} />
    </div>
  );
}
