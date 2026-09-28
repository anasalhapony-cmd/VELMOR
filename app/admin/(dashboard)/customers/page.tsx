import Link from 'next/link';
import { Search } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { getCustomers } from '@/lib/admin/queries';
import { PageHeader, EmptyState, Pager } from '@/components/admin/ui';
import { formatPrice } from '@/lib/utils/money';
import { formatDate } from '@/lib/utils/format';

const PER_PAGE = 30;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermission('view_orders');
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const { total, items } = await getCustomers(q || null, PER_PAGE, (page - 1) * PER_PAGE);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const makeHref = (p: number) => `/admin/customers?${new URLSearchParams({ q, page: String(p) }).toString()}`;

  return (
    <div>
      <PageHeader title="العملاء" description={`${total} عميل (حسب رقم الهاتف)`} />

      <form className="mb-5 flex items-center gap-2" action="/admin/customers">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="pointer-events-none absolute inset-y-0 my-auto start-3 text-ink-500" />
          <input name="q" defaultValue={q} placeholder="الاسم أو رقم الهاتف…" className="admin-input ps-9" />
        </div>
        <button type="submit" className="btn-outline">بحث</button>
      </form>

      {items.length === 0 ? (
        <EmptyState title="لا يوجد عملاء" description="سيظهر العملاء هنا بعد أول طلب." />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr><th>الاسم</th><th>الهاتف</th><th>المدينة</th><th>عدد الطلبات</th><th>أنفق (مُسلّم)</th><th>آخر طلب</th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.phone}>
                  <td className="font-medium">{c.name}</td>
                  <td dir="ltr" className="font-mono text-xs">
                    <Link href={`/admin/orders?q=${encodeURIComponent(c.phone)}`} className="text-gold-700 hover:underline">
                      {c.phone}
                    </Link>
                  </td>
                  <td>{c.city ?? '—'}</td>
                  <td className="tabular-nums">{c.orders}</td>
                  <td className="tabular-nums">{formatPrice(c.spent)}</td>
                  <td className="whitespace-nowrap text-xs text-ink-500">{c.last_order ? formatDate(c.last_order) : '—'}</td>
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
