import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, ActiveBadge, Badge } from '@/components/admin/ui';
import { DangerButton } from '@/components/admin/DangerButton';
import { deleteBlock } from '../actions';

export default async function BlocksList() {
  await requirePermission('manage_cms');
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('cms_blocks')
    .select('*')
    .order('section_key', { ascending: true })
    .order('sort_order', { ascending: true });

  return (
    <div>
      <PageHeader
        title="كتل المحتوى"
        description="عناصر محتوى قابلة للجدولة (شرائح الواجهة، الإعلانات، قصة العلامة…)."
        backHref="/admin/cms"
        action={<Link href="/admin/cms/blocks/new" className="btn-primary"><Plus size={16} /> كتلة جديدة</Link>}
      />
      {!rows || rows.length === 0 ? (
        <EmptyState title="لا توجد كتل محتوى" action={<Link href="/admin/cms/blocks/new" className="btn-primary"><Plus size={16} /> كتلة جديدة</Link>} />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>القسم</th><th>العنوان</th><th>الترتيب</th><th>الحالة</th><th className="text-end">إجراءات</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Badge tone="neutral">{r.section_key}</Badge></td>
                  <td className="font-medium">{r.title ?? '—'}</td>
                  <td className="tabular-nums">{r.sort_order}</td>
                  <td><ActiveBadge active={r.active} /></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/cms/blocks/${r.id}`} className="admin-btn-sm"><Pencil size={14} /> تعديل</Link>
                      <form action={deleteBlock}><input type="hidden" name="id" value={r.id} /><DangerButton /></form>
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
