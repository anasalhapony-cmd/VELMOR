import { requirePermission } from '@/lib/admin/auth';
import { PageHeader } from '@/components/admin/ui';
import { FamilyForm } from '@/components/admin/forms/FamilyForm';
import { createFamily } from '../actions';

export default async function NewFamilyPage() {
  await requirePermission('manage_products');
  return (
    <div>
      <PageHeader title="عائلة عطرية جديدة" backHref="/admin/families" />
      <FamilyForm action={createFamily} />
    </div>
  );
}
