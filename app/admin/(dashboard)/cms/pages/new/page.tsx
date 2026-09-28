import { requirePermission } from '@/lib/admin/auth';
import { PageHeader } from '@/components/admin/ui';
import { PageForm } from '@/components/admin/forms/PageForm';
import { savePage } from '../../actions';

export default async function NewCmsPage() {
  await requirePermission('manage_cms');
  return (
    <div>
      <PageHeader title="صفحة جديدة" backHref="/admin/cms/pages" />
      <PageForm action={savePage} />
    </div>
  );
}
