import { requirePermission } from '@/lib/admin/auth';
import { PageHeader } from '@/components/admin/ui';
import { NoteForm } from '@/components/admin/forms/NoteForm';
import { createNote } from '../actions';

export default async function NewNotePage() {
  await requirePermission('manage_products');
  return (
    <div>
      <PageHeader title="نوتة عطرية جديدة" backHref="/admin/notes" />
      <NoteForm action={createNote} />
    </div>
  );
}
