import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, Badge, ActiveBadge } from '@/components/admin/ui';
import { DangerButton } from '@/components/admin/DangerButton';
import { deletePage } from '../actions';

export default async function CmsPagesList() {
  await requirePermission('manage_cms');
  const supabase = await createClient();
  const { data: pages } = await supabase.from('pages').select('*').order('slug');

  return (
    <div>
      <PageHeader
        title="الصفحات"
        description="صفحات معلوماتية/قانونية (سياسة الخصوصية، الشروط، من نحن…)."
        backHref="/admin/cms"
        action={<Link href="/admin/cms/pages/new" className="btn-primary"><Plus size={16} /> صفحة جديدة</Link>}
      />
      {!pages || pages.length === 0 ? (
        <EmptyState title="لا توجد صفحات" action={<Link href="/admin/cms/pages/new" className="btn-primary"><Plus size={16} /> صفحة جديدة</Link>} />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>الرابط</th><th>العنوان</th><th>النشر</th><th>الحالة</th><th className="text-end">إجراءات</th></tr></thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.slug}>
                  <td className="font-mono text-xs text-ink-500">{p.slug}</td>
                  <td className="font-medium">{p.title}</td>
                  <td>{p.approved ? <Badge tone="success">معتمدة</Badge> : <Badge tone="warning">مسودة</Badge>}</td>
                  <td><ActiveBadge active={p.active} /></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/cms/pages/${p.slug}`} className="admin-btn-sm"><Pencil size={14} /> تعديل</Link>
                      <form action={deletePage}><input type="hidden" name="slug" value={p.slug} /><DangerButton /></form>
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
