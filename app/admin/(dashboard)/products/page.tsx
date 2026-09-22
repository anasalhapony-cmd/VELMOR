import Link from 'next/link';
import { Plus, Pencil, Search } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, Badge, ActiveBadge } from '@/components/admin/ui';
import { Pager } from '@/components/admin/ui';

const PER_PAGE = 20;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requirePermission('manage_products');
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const status = sp.status ?? 'live';
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PER_PAGE;

  const supabase = await createClient();
  let query = supabase
    .from('products')
    .select('id, name, name_ar, slug, brand_id, active, archived, is_featured, is_new_arrival, is_best_seller, sort_order', {
      count: 'exact',
    });

  if (q) query = query.ilike('search_text', `%${q}%`);
  if (status === 'live') query = query.eq('archived', false);
  else if (status === 'archived') query = query.eq('archived', true);

  const { data: products, count } = await query
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .range(from, from + PER_PAGE - 1);

  const brandIds = [...new Set((products ?? []).map((p) => p.brand_id).filter(Boolean))] as string[];
  const { data: brands } = brandIds.length
    ? await supabase.from('brands').select('id, name').in('id', brandIds)
    : { data: [] as { id: string; name: string }[] };
  const brandName = new Map((brands ?? []).map((b) => [b.id, b.name]));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const makeHref = (p: number) =>
    `/admin/products?${new URLSearchParams({ q, status, page: String(p) }).toString()}`;

  return (
    <div>
      <PageHeader
        title="المنتجات"
        description={`${total} منتج`}
        action={<Link href="/admin/products/new" className="btn-primary"><Plus size={16} /> منتج جديد</Link>}
      />

      <form className="mb-5 flex flex-wrap items-center gap-2" action="/admin/products">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="pointer-events-none absolute inset-y-0 my-auto start-3 text-ink-500" />
          <input name="q" defaultValue={q} placeholder="ابحث بالاسم…" className="admin-input ps-9" />
        </div>
        <select name="status" defaultValue={status} className="admin-input w-auto">
          <option value="live">المنشورة</option>
          <option value="archived">المؤرشفة</option>
          <option value="all">الكل</option>
        </select>
        <button type="submit" className="btn-outline">بحث</button>
      </form>

      {!products || products.length === 0 ? (
        <EmptyState
          title="لا توجد منتجات"
          description={q ? 'لا نتائج مطابقة لبحثك.' : 'ابدأ بإضافة أول منتج.'}
          action={<Link href="/admin/products/new" className="btn-primary"><Plus size={16} /> منتج جديد</Link>}
        />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr><th>المنتج</th><th>العلامة</th><th>الشارات</th><th>الحالة</th><th className="text-end">إجراءات</th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="font-medium">{p.name_ar || p.name}</div>
                    <div className="font-mono text-xs text-ink-500">{p.slug}</div>
                  </td>
                  <td className="text-ink-600">{p.brand_id ? brandName.get(p.brand_id) ?? '—' : '—'}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {p.is_featured && <Badge tone="gold">مميّز</Badge>}
                      {p.is_new_arrival && <Badge tone="info">جديد</Badge>}
                      {p.is_best_seller && <Badge tone="success">الأكثر مبيعًا</Badge>}
                      {p.archived && <Badge tone="danger">مؤرشف</Badge>}
                    </div>
                  </td>
                  <td><ActiveBadge active={p.active} /></td>
                  <td className="text-end">
                    <Link href={`/admin/products/${p.id}`} className="admin-btn-sm"><Pencil size={14} /> تعديل</Link>
                  </td>
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
