import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, ActiveBadge } from '@/components/admin/ui';
import { DangerButton } from '@/components/admin/DangerButton';
import { deleteFaq } from '../actions';

export default async function FaqList() {
  await requirePermission('manage_cms');
  const supabase = await createClient();
  const { data: rows } = await supabase.from('faqs').select('*').order('sort_order', { ascending: true });

  return (
    <div>
      <PageHeader
        title="الأسئلة الشائعة"
        backHref="/admin/cms"
        action={<Link href="/admin/cms/faq/new" className="btn-primary"><Plus size={16} /> سؤال جديد</Link>}
      />
      {!rows || rows.length === 0 ? (
        <EmptyState title="لا توجد أسئلة" action={<Link href="/admin/cms/faq/new" className="btn-primary"><Plus size={16} /> سؤال جديد</Link>} />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>السؤال</th><th>الترتيب</th><th>الحالة</th><th className="text-end">إجراءات</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.question}</td>
                  <td className="tabular-nums">{r.sort_order}</td>
                  <td><ActiveBadge active={r.active} /></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/cms/faq/${r.id}`} className="admin-btn-sm"><Pencil size={14} /> تعديل</Link>
                      <form action={deleteFaq}><input type="hidden" name="id" value={r.id} /><DangerButton /></form>
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
