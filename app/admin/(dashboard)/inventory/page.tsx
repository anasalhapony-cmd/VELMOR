import Link from 'next/link';
import { Search, History } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, Badge, Pager } from '@/components/admin/ui';
import { EntityForm, NumberField, SelectField, TextField } from '@/components/admin/form';
import { stockLevel, STOCK_LEVEL_LABELS_AR } from '@/config/constants';
import { adjustStock } from './actions';

const PER_PAGE = 30;

const REASONS = [
  { value: 'RESTOCK', label: 'إعادة تخزين' },
  { value: 'MANUAL_ADJUSTMENT', label: 'تعديل يدوي' },
  { value: 'RETURN', label: 'إرجاع' },
  { value: 'CORRECTION', label: 'تصحيح' },
];

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  await requirePermission('manage_inventory');
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const filter = sp.filter ?? 'all';
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PER_PAGE;

  const supabase = await createClient();

  // Resolve product ids matching the text search (by name), to combine with SKU/barcode.
  let productIds: string[] = [];
  if (q) {
    const { data: prods } = await supabase.from('products').select('id').ilike('search_text', `%${q}%`).limit(200);
    productIds = (prods ?? []).map((p) => p.id);
  }

  let query = supabase
    .from('product_variants')
    .select('id, product_id, size, unit, sku, barcode, stock_quantity, active', { count: 'exact' });

  if (filter === 'low') query = query.gt('stock_quantity', 0).lte('stock_quantity', 10);
  else if (filter === 'out') query = query.eq('stock_quantity', 0);

  if (q) {
    const clauses = [`sku.ilike.%${q}%`, `barcode.ilike.%${q}%`];
    if (productIds.length) clauses.push(`product_id.in.(${productIds.join(',')})`);
    query = query.or(clauses.join(','));
  }

  const { data: variants, count } = await query
    .order('stock_quantity', { ascending: true })
    .range(from, from + PER_PAGE - 1);

  const pIds = [...new Set((variants ?? []).map((v) => v.product_id))];
  const { data: products } = pIds.length
    ? await supabase.from('products').select('id, name, name_ar').in('id', pIds)
    : { data: [] as { id: string; name: string; name_ar: string | null }[] };
  const pName = new Map((products ?? []).map((p) => [p.id, p.name_ar || p.name]));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const makeHref = (p: number) => `/admin/inventory?${new URLSearchParams({ q, filter, page: String(p) }).toString()}`;

  return (
    <div>
      <PageHeader title="المخزون" description={`${total} مقاس`} />

      <form className="mb-5 flex flex-wrap items-center gap-2" action="/admin/inventory">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="pointer-events-none absolute inset-y-0 my-auto start-3 text-ink-500" />
          <input name="q" defaultValue={q} placeholder="اسم المنتج أو SKU أو الباركود…" className="admin-input ps-9" />
        </div>
        <select name="filter" defaultValue={filter} className="admin-input w-auto">
          <option value="all">الكل</option>
          <option value="low">مخزون منخفض</option>
          <option value="out">نفد المخزون</option>
        </select>
        <button type="submit" className="btn-outline">تصفية</button>
      </form>

      {!variants || variants.length === 0 ? (
        <EmptyState title="لا توجد مقاسات" description="أضِف مقاسات للمنتجات أولًا." />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr><th>المنتج</th><th>المقاس</th><th>SKU</th><th>المخزون</th><th>الحالة</th><th className="text-end">تعديل</th></tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const lvl = stockLevel(v.stock_quantity);
                return (
                  <tr key={v.id}>
                    <td className="font-medium">{pName.get(v.product_id) ?? '—'}</td>
                    <td>{Number(v.size)} {v.unit}</td>
                    <td className="font-mono text-xs text-ink-500">{v.sku ?? '—'}</td>
                    <td className="tabular-nums font-semibold">{v.stock_quantity}</td>
                    <td>
                      <Badge tone={lvl === 'OUT_OF_STOCK' ? 'danger' : lvl === 'LOW_STOCK' ? 'warning' : 'success'}>
                        {STOCK_LEVEL_LABELS_AR[lvl]}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/inventory/${v.id}`} className="admin-btn-sm"><History size={14} /> السجل</Link>
                        <details className="relative">
                          <summary className="admin-btn-sm cursor-pointer list-none">تعديل الكمية</summary>
                          <div className="absolute end-0 z-10 mt-2 w-72 rounded-lg border border-ink/10 bg-white p-4 shadow-lg">
                            <EntityForm action={adjustStock} submitLabel="تطبيق">
                              <input type="hidden" name="variant_id" value={v.id} />
                              <NumberField name="change" label="التغيير (+ إضافة / − خصم)" required step="1" placeholder="مثال: 10 أو -3" />
                              <SelectField name="reason" label="السبب" required options={REASONS} />
                              <TextField name="note" label="ملاحظة" />
                            </EntityForm>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} totalPages={totalPages} makeHref={makeHref} />
    </div>
  );
}
