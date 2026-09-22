import Link from 'next/link';
import { Search } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, OrderStatusPill, Pager } from '@/components/admin/ui';
import { formatPrice } from '@/lib/utils/money';
import { formatDateTime } from '@/lib/utils/format';
import { ORDER_STATUSES, ORDER_STATUS_LABELS_AR, type OrderStatus } from '@/config/constants';

const PER_PAGE = 20;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; city?: string; page?: string }>;
}) {
  await requirePermission('view_orders');
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const status = sp.status ?? '';
  const city = (sp.city ?? '').trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PER_PAGE;

  const supabase = await createClient();
  let query = supabase
    .from('orders')
    .select('id, public_order_number, customer_name, phone, city, total, payment_method, order_status, created_at', {
      count: 'exact',
    });

  if (q) query = query.or(`public_order_number.ilike.%${q}%,phone.ilike.%${q}%,customer_name.ilike.%${q}%`);
  if (status && ORDER_STATUSES.includes(status as OrderStatus)) query = query.eq('order_status', status as OrderStatus);
  if (city) query = query.ilike('city', `%${city}%`);

  const { data: orders, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PER_PAGE - 1);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const makeHref = (p: number) =>
    `/admin/orders?${new URLSearchParams({ q, status, city, page: String(p) }).toString()}`;

  return (
    <div>
      <PageHeader title="الطلبات" description={`${total} طلب`} />

      <form className="mb-5 flex flex-wrap items-center gap-2" action="/admin/orders">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="pointer-events-none absolute inset-y-0 my-auto start-3 text-ink-500" />
          <input name="q" defaultValue={q} placeholder="رقم الطلب أو الهاتف أو الاسم…" className="admin-input ps-9" />
        </div>
        <select name="status" defaultValue={status} className="admin-input w-auto">
          <option value="">كل الحالات</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS_AR[s]}</option>
          ))}
        </select>
        <input name="city" defaultValue={city} placeholder="المدينة" className="admin-input w-32" />
        <button type="submit" className="btn-outline">تصفية</button>
      </form>

      {!orders || orders.length === 0 ? (
        <EmptyState title="لا توجد طلبات" description={q || status || city ? 'لا نتائج مطابقة.' : 'ستظهر الطلبات هنا فور وصولها.'} />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr><th>رقم الطلب</th><th>العميل</th><th>الهاتف</th><th>المدينة</th><th>الإجمالي</th><th>الحالة</th><th>التاريخ</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="font-mono text-xs">
                    <Link href={`/admin/orders/${o.id}`} className="text-gold-700 hover:underline">{o.public_order_number}</Link>
                  </td>
                  <td className="font-medium">{o.customer_name}</td>
                  <td dir="ltr" className="font-mono text-xs text-ink-600">{o.phone}</td>
                  <td>{o.city}</td>
                  <td className="tabular-nums">{formatPrice(o.total)}</td>
                  <td><OrderStatusPill status={o.order_status} /></td>
                  <td className="whitespace-nowrap text-xs text-ink-500">{formatDateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} totalPages={totalPages} makeHref={makeHref} />
    </div>
  );
}
