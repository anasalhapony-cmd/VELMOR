import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, ActiveBadge } from '@/components/admin/ui';
import { DangerButton } from '@/components/admin/DangerButton';
import { setCategoryActive, deleteCategory } from './actions';

export default async function CategoriesPage() {
  await requirePermission('manage_products');
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  const nameById = new Map((rows ?? []).map((r) => [r.id, r.name]));

  return (
    <div>
      <PageHeader
        title="التصنيفات"
        description="تصنيفات هرمية للمنتجات (رجالية/نسائية، شرقية/خشبية…)."
        action={<Link href="/admin/categories/new" className="btn-primary"><Plus size={16} /> تصنيف جديد</Link>}
      />
      {!rows || rows.length === 0 ? (
        <EmptyState title="لا توجد تصنيفات بعد" action={<Link href="/admin/categories/new" className="btn-primary"><Plus size={16} /> تصنيف جديد</Link>} />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>الاسم</th><th>الرابط</th><th>الأب</th><th>الحالة</th><th className="text-end">إجراءات</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td className="font-mono text-xs text-ink-500">{r.slug}</td>
                  <td className="text-ink-500">{r.parent_id ? nameById.get(r.parent_id) ?? '—' : '—'}</td>
                  <td><ActiveBadge active={r.active} /></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/categories/${r.id}`} className="admin-btn-sm"><Pencil size={14} /> تعديل</Link>
                      <form action={setCategoryActive}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="active" value={r.active ? '' : 'on'} />
                        <button type="submit" className="admin-btn-sm">{r.active ? 'تعطيل' : 'تفعيل'}</button>
                      </form>
                      <form action={deleteCategory}><input type="hidden" name="id" value={r.id} /><DangerButton /></form>
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
