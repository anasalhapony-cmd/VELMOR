import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/ui';
import { AccountForm } from '@/components/admin/forms/AccountForm';
import { updateAdminAccount } from '../actions';

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const supabase = await createClient();
  const { data: account } = await supabase.from('admin_users').select('*').eq('id', id).maybeSingle();
  if (!account) notFound();

  let email = '';
  try {
    const svc = createAdminClient();
    const { data } = await svc.auth.admin.getUserById(id);
    email = data?.user?.email ?? '';
  } catch {
    /* best-effort */
  }

  return (
    <div>
      <PageHeader title={`تعديل: ${account.full_name || email}`} backHref="/admin/accounts" />
      <AccountForm action={updateAdminAccount} defaults={account} email={email} />
    </div>
  );
}
