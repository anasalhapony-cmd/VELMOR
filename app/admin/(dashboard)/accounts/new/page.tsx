import { requireOwner } from '@/lib/admin/auth';
import { PageHeader } from '@/components/admin/ui';
import { AccountForm } from '@/components/admin/forms/AccountForm';
import { createAdminAccount } from '../actions';

export default async function NewAccountPage() {
  await requireOwner();
  return (
    <div>
      <PageHeader title="حساب مشرف جديد" backHref="/admin/accounts" />
      <AccountForm action={createAdminAccount} />
    </div>
  );
}
