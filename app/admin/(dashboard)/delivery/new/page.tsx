import { requirePermission } from '@/lib/admin/auth';
import { PageHeader } from '@/components/admin/ui';
import { ZoneForm } from '@/components/admin/forms/ZoneForm';
import { createZone } from '../actions';

export default async function NewZonePage() {
  await requirePermission('manage_delivery');
  return (
    <div>
      <PageHeader title="منطقة توصيل جديدة" backHref="/admin/delivery" />
      <ZoneForm action={createZone} />
    </div>
  );
}
