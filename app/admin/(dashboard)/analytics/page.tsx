import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { getDashboardMetrics, getSalesSeries, getTopProducts, getOrdersByCity } from '@/lib/admin/queries';
import { PageHeader, StatCard } from '@/components/admin/ui';
import { formatPrice } from '@/lib/utils/money';

const FUNNEL: { event: string; label: string }[] = [
  { event: 'product_viewed', label: 'مشاهدات المنتجات' },
  { event: 'add_to_cart', label: 'إضافة للسلة' },
  { event: 'checkout_started', label: 'بدء الدفع' },
  { event: 'order_completed', label: 'طلبات مكتملة' },
];

async function eventCounts() {
  const supabase = await createClient();
  const results = await Promise.all(
    FUNNEL.map(async (f) => {
      const { count } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', f.event);
      return { ...f, count: count ?? 0 };
    })
  );
  return results;
}

async function couponUsage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('coupons')
    .select('code, type, value, used_count')
    .gt('used_count', 0)
    .order('used_count', { ascending: false })
    .limit(8);
  return data ?? [];
}

export default async function AnalyticsPage() {
  await requirePermission('view_analytics');
  const [metrics, series, top, cities, funnel, coupons] = await Promise.all([
    getDashboardMetrics(),
    getSalesSeries(30),
    getTopProducts(10),
    getOrdersByCity(),
    eventCounts(),
    couponUsage(),
  ]);

  const maxRealised = Math.max(1, ...series.map((s) => s.realised));

  return (
    <div>
      <PageHeader title="التحليلات" description="الإيراد المحقّق يُحتسب من الطلبات المُسلّمة فقط (COD)." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="إجمالي الطلبات" value={metrics.orders_total} />
        <StatCard label="مُسلّمة" value={metrics.orders_delivered} tone="success" />
        <StatCard label="ملغاة/فاشلة" value={metrics.orders_cancelled} tone="danger" />
        <StatCard label="عملاء" value={metrics.customers_total} />
        <StatCard label="إيراد محقّق" value={formatPrice(metrics.revenue_realised)} tone="success" />
        <StatCard label="إيراد مطلوب" value={formatPrice(metrics.revenue_ordered)} />
        <StatCard label="متوسط قيمة الطلب" value={formatPrice(metrics.aov_realised)} />
        <StatCard label="قيد المراجعة" value={metrics.orders_pending} tone={metrics.orders_pending ? 'warning' : 'default'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="admin-card">
          <h2 className="mb-4 font-medium text-ink">الإيراد المحقّق — ٣٠ يومًا</h2>
          <div className="flex h-40 items-end gap-1">
            {series.map((s) => (
              <div key={s.date} className="flex-1" title={`${s.date}: ${formatPrice(s.realised)}`}>
                <div className="w-full rounded-sm bg-gold/70" style={{ height: `${(s.realised / maxRealised) * 100}%` }} />
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <h2 className="mb-4 font-medium text-ink">مسار التحويل</h2>
          <ul className="space-y-3">
            {funnel.map((f) => (
              <li key={f.event} className="flex items-center justify-between text-sm">
                <span>{f.label}</span>
                <span className="tabular-nums font-semibold">{f.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-card">
          <h2 className="mb-3 font-medium text-ink">الأكثر مبيعًا (مُسلّم)</h2>
          {top.length === 0 ? <p className="text-sm text-ink-500">لا بيانات.</p> : (
            <table className="admin-table">
              <thead><tr><th>المنتج</th><th>الكمية</th><th>الإيراد</th></tr></thead>
              <tbody>
                {top.map((t, i) => (
                  <tr key={t.product_id ?? i}>
                    <td className="font-medium">{t.name}</td>
                    <td className="tabular-nums">{t.qty}</td>
                    <td className="tabular-nums">{formatPrice(t.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="admin-card">
          <h2 className="mb-3 font-medium text-ink">استخدام الكوبونات</h2>
          {coupons.length === 0 ? <p className="text-sm text-ink-500">لا استخدام بعد.</p> : (
            <table className="admin-table">
              <thead><tr><th>الكود</th><th>الخصم</th><th>مرات الاستخدام</th></tr></thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.code}>
                    <td className="font-mono">{c.code}</td>
                    <td>{c.type === 'PERCENTAGE' ? `${Number(c.value)}%` : formatPrice(c.value)}</td>
                    <td className="tabular-nums">{c.used_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="admin-card">
          <h2 className="mb-3 font-medium text-ink">الطلبات حسب المدينة</h2>
          {cities.length === 0 ? <p className="text-sm text-ink-500">لا بيانات.</p> : (
            <table className="admin-table">
              <thead><tr><th>المدينة</th><th>الطلبات</th><th>القيمة</th></tr></thead>
              <tbody>
                {cities.map((c) => (
                  <tr key={c.city}>
                    <td>{c.city}</td>
                    <td className="tabular-nums">{c.orders}</td>
                    <td className="tabular-nums">{formatPrice(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
