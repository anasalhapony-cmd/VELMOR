import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, Badge } from '@/components/admin/ui';
import { formatDateTime } from '@/lib/utils/format';
import type { InventoryReason } from '@/config/constants';

const REASON_LABELS: Record<InventoryReason, string> = {
  SALE: 'بيع',
  RESTOCK: 'إعادة تخزين',
  MANUAL_ADJUSTMENT: 'تعديل يدوي',
  CANCELLATION: 'إلغاء طلب',
  RETURN: 'إرجاع',
  CORRECTION: 'تصحيح',
};

export default async function VariantHistoryPage({ params }: { params: Promise<{ variantId: string }> }) {
  await requirePermission('manage_inventory');
  const { variantId } = await params;
  const supabase = await createClient();

  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, product_id, size, unit, sku, stock_quantity')
    .eq('id', variantId)
    .maybeSingle();
  if (!variant) notFound();

  const [{ data: product }, { data: moves }] = await Promise.all([
    supabase.from('products').select('name, name_ar').eq('id', variant.product_id).maybeSingle(),
    supabase.from('inventory_movements').select('*').eq('variant_id', variantId).order('created_at', { ascending: false }).limit(200),
  ]);

  const title = `${product?.name_ar || product?.name || 'منتج'} — ${Number(variant.size)} ${variant.unit}`;

  return (
    <div>
      <PageHeader
        title="سجل حركة المخزون"
        description={`${title} · المخزون الحالي: ${variant.stock_quantity}`}
        backHref="/admin/inventory"
      />
      {!moves || moves.length === 0 ? (
        <EmptyState title="لا توجد حركات" description="لم تُسجّل أي حركات مخزون لهذا المقاس بعد." />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr><th>التاريخ</th><th>السبب</th><th>قبل</th><th>التغيير</th><th>بعد</th><th>الطلب</th><th>ملاحظة</th></tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap text-xs text-ink-500">{formatDateTime(m.created_at)}</td>
                  <td><Badge tone={m.reason === 'SALE' ? 'info' : m.change < 0 ? 'warning' : 'success'}>{REASON_LABELS[m.reason]}</Badge></td>
                  <td className="tabular-nums text-ink-500">{m.previous_quantity}</td>
                  <td className={`tabular-nums font-semibold ${m.change < 0 ? 'text-danger' : 'text-success'}`}>
                    {m.change > 0 ? `+${m.change}` : m.change}
                  </td>
                  <td className="tabular-nums font-semibold">{m.new_quantity}</td>
                  <td className="font-mono text-xs">
                    {m.order_id ? (
                      <Link href={`/admin/orders/${m.order_id}`} className="text-gold-700 hover:underline">عرض</Link>
                    ) : '—'}
                  </td>
                  <td className="text-xs text-ink-600">{m.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
