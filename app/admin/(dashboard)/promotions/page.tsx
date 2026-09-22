import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, ActiveBadge, Badge } from '@/components/admin/ui';
import { DangerButton } from '@/components/admin/DangerButton';
import { formatDate } from '@/lib/utils/format';
import { setPromotionActive, deletePromotion } from './actions';

export default async function PromotionsPage() {
  await requirePermission('manage_coupons');
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('promotions')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  return (
    <div>
      <PageHeader
        title="العروض"
        description="عروض قابلة للتهيئة (تخفيضات، حزم، مواسم)."
        action={<Link href="/admin/promotions/new" className="btn-primary"><Plus size={16} /> عرض جديد</Link>}
      />
      {!rows || rows.length === 0 ? (
        <EmptyState title="لا توجد عروض" action={<Link href="/admin/promotions/new" className="btn-primary"><Plus size={16} /> عرض جديد</Link>} />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>العنوان</th><th>النوع</th><th>الفترة</th><th>الحالة</th><th className="text-end">إجراءات</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.title}</td>
                  <td><Badge tone="info">{p.kind}</Badge></td>
                  <td className="text-xs text-ink-500">
                    {p.starts_at ? formatDate(p.starts_at) : '—'} → {p.ends_at ? formatDate(p.ends_at) : '—'}
                  </td>
                  <td><ActiveBadge active={p.active} /></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/promotions/${p.id}`} className="admin-btn-sm"><Pencil size={14} /> تعديل</Link>
                      <form action={setPromotionActive}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="active" value={p.active ? '' : 'on'} />
                        <button type="submit" className="admin-btn-sm">{p.active ? 'تعطيل' : 'تفعيل'}</button>
                      </form>
                      <form action={deletePromotion}><input type="hidden" name="id" value={p.id} /><DangerButton /></form>
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
