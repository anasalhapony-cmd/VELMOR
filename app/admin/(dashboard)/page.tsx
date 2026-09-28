import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { getAdminIdentity } from '@/lib/admin/auth';
import { hasPermission, PERMISSION_LABELS_AR } from '@/lib/admin/permissions';
import { getDashboardMetrics, getSalesSeries, getTopProducts } from '@/lib/admin/queries';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, StatCard, OrderStatusPill } from '@/components/admin/ui';
import { formatPrice } from '@/lib/utils/money';
import { formatDate } from '@/lib/utils/format';
import type { AdminPermission } from '@/config/constants';

async function recentOrders() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select('id, public_order_number, customer_name, city, total, order_status, created_at')
    .order('created_at', { ascending: false })
    .limit(8);
  return data ?? [];
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length === 0) return null;
  const max = Math.max(1, ...points);
  const w = 100;
  const gap = points.length > 1 ? w / points.length : w;
  const bw = Math.max(1, gap * 0.6);
  return (
    <svg viewBox={`0 0 ${w} 30`} className="h-16 w-full" preserveAspectRatio="none" aria-hidden>
      {points.map((v, i) => {
        const h = (v / max) * 28;
        return (
          <rect
            key={i}
            x={i * gap + (gap - bw) / 2}
            y={30 - h}
            width={bw}
            height={h}
            rx={0.5}
            className="fill-gold/70"
          />
        );
      })}
    </svg>
  );
}

export default async function AdminOverview({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const me = await getAdminIdentity();
  const { denied } = await searchParams;
  const canAnalytics = me ? hasPermission(me, 'view_analytics') : false;

  const [metrics, series, top, orders] = await Promise.all([
    canAnalytics ? getDashboardMetrics() : Promise.resolve(null),
    canAnalytics ? getSalesSeries(14) : Promise.resolve([]),
    canAnalytics ? getTopProducts(5) : Promise.resolve([]),
    me && hasPermission(me, 'view_orders') ? recentOrders() : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader title={`أهلًا، ${me?.fullName || 'مشرف'}`} description="نظرة عامة على المتجر" />

      {denied && (
        <div className="mb-6 flex items-center gap-2 rounded border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          <AlertTriangle size={16} />
          {denied === 'owner'
            ? 'هذه الصفحة مخصصة للمالك فقط.'
            : `ليست لديك صلاحية: ${PERMISSION_LABELS_AR[denied as AdminPermission] ?? denied}`}
        </div>
      )}

      {metrics ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="طلبات اليوم" value={metrics.orders_today} hint={`${formatPrice(metrics.revenue_today)} اليوم`} />
            <StatCard label="قيد المراجعة" value={metrics.orders_pending} tone={metrics.orders_pending > 0 ? 'warning' : 'default'} />
            <StatCard label="إيراد محقّق (تم التسليم)" value={formatPrice(metrics.revenue_realised)} tone="success" />
            <StatCard label="إيراد مطلوب (غير ملغى)" value={formatPrice(metrics.revenue_ordered)} hint="لا يُحتسب كإيراد نهائي" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="إجمالي الطلبات" value={metrics.orders_total} />
            <StatCard label="متوسط قيمة الطلب" value={formatPrice(metrics.aov_realised)} />
            <StatCard label="مخزون منخفض" value={metrics.low_stock} tone={metrics.low_stock > 0 ? 'warning' : 'default'} />
            <StatCard label="نفد المخزون" value={metrics.out_of_stock} tone={metrics.out_of_stock > 0 ? 'danger' : 'default'} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="admin-card lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-medium text-ink">الإيراد المحقّق — آخر ١٤ يومًا</h2>
                <Link href="/admin/analytics" className="text-xs text-gold-700 hover:underline">
                  التحليلات ←
                </Link>
              </div>
              <Sparkline points={series.map((s) => s.realised)} />
            </div>
            <div className="admin-card">
              <h2 className="mb-3 font-medium text-ink">الأكثر مبيعًا</h2>
              {top.length === 0 ? (
                <p className="text-sm text-ink-500">لا توجد مبيعات بعد.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {top.map((t, i) => (
                    <li key={t.product_id ?? i} className="flex items-center justify-between gap-2">
                      <span className="truncate">{t.name}</span>
                      <span className="shrink-0 text-ink-500">{t.qty}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="admin-card text-sm text-ink-500">
          ليست لديك صلاحية عرض التحليلات. تواصل مع المالك لمنحك صلاحية «عرض التحليلات».
        </div>
      )}

      {orders.length > 0 && (
        <div className="mt-6 admin-card overflow-x-auto">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-ink">أحدث الطلبات</h2>
            <Link href="/admin/orders" className="text-xs text-gold-700 hover:underline">
              كل الطلبات ←
            </Link>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>العميل</th>
                <th>المدينة</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="font-mono text-xs">
                    <Link href={`/admin/orders/${o.id}`} className="text-gold-700 hover:underline">
                      {o.public_order_number}
                    </Link>
                  </td>
                  <td>{o.customer_name}</td>
                  <td>{o.city}</td>
                  <td className="tabular-nums">{formatPrice(o.total)}</td>
                  <td><OrderStatusPill status={o.order_status} /></td>
                  <td className="whitespace-nowrap text-xs text-ink-500">{formatDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
