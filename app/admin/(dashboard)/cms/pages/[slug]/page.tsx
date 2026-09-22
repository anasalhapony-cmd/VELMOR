import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { PageForm } from '@/components/admin/forms/PageForm';
import { savePage } from '../../actions';

export default async function EditCmsPage({ params }: { params: Promise<{ slug: string }> }) {
  await requirePermission('manage_cms');
  const { slug } = await params;
  const supabase = await createClient();
  const { data: page } = await supabase.from('pages').select('*').eq('slug', slug).maybeSingle();
  if (!page) notFound();
  return (
    <div>
      <PageHeader title={`تعديل: ${page.title}`} backHref="/admin/cms/pages" />
      <PageForm action={savePage} defaults={page} />
    </div>
  );
}
