import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, ActiveBadge } from '@/components/admin/ui';
import { DangerButton } from '@/components/admin/DangerButton';
import { formatPrice } from '@/lib/utils/money';
import { setZoneActive, deleteZone } from './actions';

export default async function DeliveryPage() {
  await requirePermission('manage_delivery');
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('delivery_zones')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  return (
    <div>
      <PageHeader
        title="مناطق التوصيل"
        description="رسوم التوصيل تُحسب على الخادم حسب المنطقة المختارة عند الدفع."
        action={<Link href="/admin/delivery/new" className="btn-primary"><Plus size={16} /> منطقة جديدة</Link>}
      />
      {!rows || rows.length === 0 ? (
        <EmptyState title="لا توجد مناطق توصيل" description="أضف منطقة واحدة على الأقل حتى يعمل الدفع." action={<Link href="/admin/delivery/new" className="btn-primary"><Plus size={16} /> منطقة جديدة</Link>} />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>المنطقة</th><th>المدينة</th><th>الحي</th><th>الرسوم</th><th>الحالة</th><th className="text-end">إجراءات</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td>{r.city}</td>
                  <td className="text-ink-500">{r.area ?? '—'}</td>
                  <td className="tabular-nums">{formatPrice(r.fee)}</td>
                  <td><ActiveBadge active={r.active} /></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/delivery/${r.id}`} className="admin-btn-sm"><Pencil size={14} /> تعديل</Link>
                      <form action={setZoneActive}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="active" value={r.active ? '' : 'on'} />
                        <button type="submit" className="admin-btn-sm">{r.active ? 'تعطيل' : 'تفعيل'}</button>
                      </form>
                      <form action={deleteZone}><input type="hidden" name="id" value={r.id} /><DangerButton /></form>
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
