import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { FaqForm } from '@/components/admin/forms/FaqForm';
import { saveFaq } from '../../actions';

export default async function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('manage_cms');
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase.from('faqs').select('*').eq('id', id).maybeSingle();
  if (!row) notFound();
  return (
    <div>
      <PageHeader title="تعديل السؤال" backHref="/admin/cms/faq" />
      <FaqForm action={saveFaq} defaults={row} />
    </div>
  );
}
