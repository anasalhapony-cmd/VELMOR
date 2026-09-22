import { requirePermission } from '@/lib/admin/auth';
import { PageHeader } from '@/components/admin/ui';
import { FaqForm } from '@/components/admin/forms/FaqForm';
import { saveFaq } from '../../actions';

export default async function NewFaqPage() {
  await requirePermission('manage_cms');
  return (
    <div>
      <PageHeader title="سؤال جديد" backHref="/admin/cms/faq" />
      <FaqForm action={saveFaq} />
    </div>
  );
}
