import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { requireOwner } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader, EmptyState, ActiveBadge, Badge } from '@/components/admin/ui';
import { ROLE_LABELS_AR } from '@/lib/admin/permissions';
import { setAccountActive } from './actions';

export default async function AccountsPage() {
  const me = await requireOwner();
  const supabase = await createClient();
  const { data: admins } = await supabase
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: true });

  // Emails live in auth.users — read them with the service role for display only.
  const emailById = new Map<string, string>();
  try {
    const svc = createAdminClient();
    const { data } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const u of data?.users ?? []) if (u.email) emailById.set(u.id, u.email);
  } catch {
    /* listing emails is best-effort */
  }

  return (
    <div>
      <PageHeader
        title="حسابات المشرفين"
        description="إدارة من يمكنه الدخول للوحة التحكم وصلاحياته (المالك فقط)."
        action={<Link href="/admin/accounts/new" className="btn-primary"><Plus size={16} /> حساب جديد</Link>}
      />
      {!admins || admins.length === 0 ? (
        <EmptyState title="لا توجد حسابات" />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>الصلاحيات</th><th>الحالة</th><th className="text-end">إجراءات</th></tr></thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{a.full_name || '—'}{a.id === me.id && <span className="ms-2 text-xs text-ink-500">(أنت)</span>}</td>
                  <td dir="ltr" className="font-mono text-xs text-ink-600">{emailById.get(a.id) ?? '—'}</td>
                  <td><Badge tone={a.role === 'owner' ? 'gold' : 'neutral'}>{ROLE_LABELS_AR[a.role]}</Badge></td>
                  <td className="text-xs text-ink-500">{a.role === 'owner' ? 'كل الصلاحيات' : `${a.permissions.length} صلاحية`}</td>
                  <td><ActiveBadge active={a.active} /></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/accounts/${a.id}`} className="admin-btn-sm"><Pencil size={14} /> تعديل</Link>
                      {a.id !== me.id && (
                        <form action={setAccountActive}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="active" value={a.active ? '' : 'on'} />
                          <button type="submit" className="admin-btn-sm">{a.active ? 'تعطيل' : 'تفعيل'}</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
