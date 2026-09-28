import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, ActiveBadge, Badge } from '@/components/admin/ui';
import { DangerButton } from '@/components/admin/DangerButton';
import { setCollectionActive, deleteCollection } from './actions';

export default async function CollectionsPage() {
  await requirePermission('manage_products');
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('collections')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  return (
    <div>
      <PageHeader
        title="المجموعات"
        description="مجموعات تحريرية أو موسمية تُعرض في الصفحة الرئيسية وصفحات /collections."
        action={<Link href="/admin/collections/new" className="btn-primary"><Plus size={16} /> مجموعة جديدة</Link>}
      />
      {!rows || rows.length === 0 ? (
        <EmptyState title="لا توجد مجموعات بعد" action={<Link href="/admin/collections/new" className="btn-primary"><Plus size={16} /> مجموعة جديدة</Link>} />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>الاسم</th><th>الرابط</th><th>النوع</th><th>الحالة</th><th className="text-end">إجراءات</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td className="font-mono text-xs text-ink-500">{r.slug}</td>
                  <td>{r.is_seasonal ? <Badge tone="gold">موسمية</Badge> : <span className="text-ink-500">عادية</span>}</td>
                  <td><ActiveBadge active={r.active} /></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/collections/${r.id}`} className="admin-btn-sm"><Pencil size={14} /> تعديل</Link>
                      <form action={setCollectionActive}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="active" value={r.active ? '' : 'on'} />
                        <button type="submit" className="admin-btn-sm">{r.active ? 'تعطيل' : 'تفعيل'}</button>
                      </form>
                      <form action={deleteCollection}><input type="hidden" name="id" value={r.id} /><DangerButton /></form>
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
