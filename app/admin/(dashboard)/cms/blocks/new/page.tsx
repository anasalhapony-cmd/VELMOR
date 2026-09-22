import { requirePermission } from '@/lib/admin/auth';
import { PageHeader } from '@/components/admin/ui';
import { BlockForm } from '@/components/admin/forms/BlockForm';
import { saveBlock } from '../../actions';

export default async function NewBlockPage() {
  await requirePermission('manage_cms');
  return (
    <div>
      <PageHeader title="كتلة محتوى جديدة" backHref="/admin/cms/blocks" />
      <BlockForm action={saveBlock} />
    </div>
  );
}
