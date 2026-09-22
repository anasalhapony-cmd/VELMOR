import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, ActiveBadge, Badge } from '@/components/admin/ui';
import { DangerButton } from '@/components/admin/DangerButton';
import { formatPrice } from '@/lib/utils/money';
import { formatDate } from '@/lib/utils/format';
import { setCouponActive, deleteCoupon } from './actions';

export default async function CouponsPage() {
  await requirePermission('manage_coupons');
  const supabase = await createClient();
  const { data: rows } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });

  return (
    <div>
      <PageHeader
        title="الكوبونات"
        description="التحقق من الكوبونات يتم على الخادم دائمًا."
        action={<Link href="/admin/coupons/new" className="btn-primary"><Plus size={16} /> كوبون جديد</Link>}
      />
      {!rows || rows.length === 0 ? (
        <EmptyState title="لا توجد كوبونات" action={<Link href="/admin/coupons/new" className="btn-primary"><Plus size={16} /> كوبون جديد</Link>} />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>الكود</th><th>الخصم</th><th>الاستخدام</th><th>الصلاحية</th><th>الحالة</th><th className="text-end">إجراءات</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono font-semibold">{c.code}</td>
                  <td>{c.type === 'PERCENTAGE' ? `${Number(c.value)}%` : formatPrice(c.value)}</td>
                  <td className="tabular-nums text-ink-600">
                    {c.used_count}{c.usage_limit != null ? ` / ${c.usage_limit}` : ''}
                  </td>
                  <td className="text-xs text-ink-500">
                    {c.ends_at ? `حتى ${formatDate(c.ends_at)}` : 'بدون انتهاء'}
                  </td>
                  <td><ActiveBadge active={c.active} /></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/coupons/${c.id}`} className="admin-btn-sm"><Pencil size={14} /> تعديل</Link>
                      <form action={setCouponActive}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="active" value={c.active ? '' : 'on'} />
                        <button type="submit" className="admin-btn-sm">{c.active ? 'تعطيل' : 'تفعيل'}</button>
                      </form>
                      <form action={deleteCoupon}><input type="hidden" name="id" value={c.id} /><DangerButton /></form>
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
