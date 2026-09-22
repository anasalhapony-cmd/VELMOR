import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, ActiveBadge } from '@/components/admin/ui';
import { DangerButton } from '@/components/admin/DangerButton';
import { setNoteActive, deleteNote } from './actions';

export default async function NotesPage() {
  await requirePermission('manage_products');
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('fragrance_notes')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  return (
    <div>
      <PageHeader
        title="النوتات العطرية"
        description="النوتات القابلة لإعادة الاستخدام (تُسند للمنتجات في محرر المنتج)."
        action={<Link href="/admin/notes/new" className="btn-primary"><Plus size={16} /> نوتة جديدة</Link>}
      />
      {!rows || rows.length === 0 ? (
        <EmptyState title="لا توجد نوتات بعد" action={<Link href="/admin/notes/new" className="btn-primary"><Plus size={16} /> نوتة جديدة</Link>} />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>الاسم</th><th>الرابط</th><th>الترتيب</th><th>الحالة</th><th className="text-end">إجراءات</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td className="font-mono text-xs text-ink-500">{r.slug}</td>
                  <td className="tabular-nums">{r.sort_order}</td>
                  <td><ActiveBadge active={r.active} /></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/notes/${r.id}`} className="admin-btn-sm"><Pencil size={14} /> تعديل</Link>
                      <form action={setNoteActive}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="active" value={r.active ? '' : 'on'} />
                        <button type="submit" className="admin-btn-sm">{r.active ? 'تعطيل' : 'تفعيل'}</button>
                      </form>
                      <form action={deleteNote}><input type="hidden" name="id" value={r.id} /><DangerButton /></form>
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
