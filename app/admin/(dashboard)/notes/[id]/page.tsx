import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { NoteForm } from '@/components/admin/forms/NoteForm';
import { updateNote } from '../actions';

export default async function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('manage_products');
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase.from('fragrance_notes').select('*').eq('id', id).maybeSingle();
  if (!row) notFound();
  return (
    <div>
      <PageHeader title={`تعديل: ${row.name}`} backHref="/admin/notes" />
      <NoteForm action={updateNote} defaults={row} />
    </div>
  );
}
