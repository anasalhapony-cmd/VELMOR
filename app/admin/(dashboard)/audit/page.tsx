import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, Badge, Pager } from '@/components/admin/ui';
import { formatDateTime } from '@/lib/utils/format';

const PER_PAGE = 40;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; page?: string }>;
}) {
  await requirePermission('view_audit_logs');
  const sp = await searchParams;
  const entity = (sp.entity ?? '').trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PER_PAGE;

  const supabase = await createClient();
  let query = supabase.from('admin_audit_logs').select('*', { count: 'exact' });
  if (entity) query = query.eq('entity', entity);
  const { data: logs, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PER_PAGE - 1);

  const adminIds = [...new Set((logs ?? []).map((l) => l.admin_id).filter(Boolean))] as string[];
  const { data: admins } = adminIds.length
    ? await supabase.from('admin_users').select('id, full_name').in('id', adminIds)
    : { data: [] as { id: string; full_name: string }[] };
  const adminName = new Map((admins ?? []).map((a) => [a.id, a.full_name]));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const makeHref = (p: number) => `/admin/audit?${new URLSearchParams({ entity, page: String(p) }).toString()}`;

  return (
    <div>
      <PageHeader title="سجل التدقيق" description={`${total} حدث · سجل غير قابل للتعديل (append-only).`} />

      <form className="mb-5 flex items-center gap-2" action="/admin/audit">
        <input name="entity" defaultValue={entity} placeholder="تصفية حسب الكيان (مثل: products)" className="admin-input w-64" />
        <button type="submit" className="btn-outline">تصفية</button>
      </form>

      {!logs || logs.length === 0 ? (
        <EmptyState title="لا توجد أحداث" description="ستُسجَّل تغييرات المشرفين هنا." />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr><th>التاريخ</th><th>المشرف</th><th>الإجراء</th><th>الكيان</th><th>المعرّف</th><th>السبب</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap text-xs text-ink-500">{formatDateTime(l.created_at)}</td>
                  <td>{l.admin_id ? adminName.get(l.admin_id) ?? '—' : 'النظام'}</td>
                  <td><Badge tone="neutral">{l.action}</Badge></td>
                  <td className="font-mono text-xs">{l.entity}</td>
                  <td className="font-mono text-xs text-ink-500">{l.entity_id ? String(l.entity_id).slice(0, 8) : '—'}</td>
                  <td className="text-xs text-ink-600">{l.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} totalPages={totalPages} makeHref={makeHref} />
    </div>
  );
}
