import { requirePermission } from '@/lib/admin/auth';
import { PageHeader } from '@/components/admin/ui';
import { CollectionForm } from '@/components/admin/forms/CollectionForm';
import { createCollection } from '../actions';

export default async function NewCollectionPage() {
  await requirePermission('manage_products');
  return (
    <div>
      <PageHeader title="مجموعة جديدة" backHref="/admin/collections" />
      <CollectionForm action={createCollection} />
    </div>
  );
}
