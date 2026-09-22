import Link from 'next/link';
import { EntityForm, TextField, NumberField, CheckboxField } from '@/components/admin/form';
import { DangerButton } from '@/components/admin/DangerButton';
import { Badge } from '@/components/admin/ui';
import { formatPrice } from '@/lib/utils/money';
import { stockLevel, STOCK_LEVEL_LABELS_AR } from '@/config/constants';
import type { ProductVariantRow } from '@/types/database';
import { createVariant, updateVariant, deleteVariant, setVariantActive } from '@/app/admin/(dashboard)/products/variant-actions';

export function VariantsSection({
  productId,
  variants,
}: {
  productId: string;
  variants: ProductVariantRow[];
}) {
  return (
    <section className="admin-card space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-ink">المقاسات والأسعار</h2>
        <Link href="/admin/inventory" className="text-xs text-gold-700 hover:underline">
          إدارة المخزون ←
        </Link>
      </div>

      {variants.length === 0 ? (
        <p className="text-sm text-ink-500">لا توجد مقاسات بعد. أضف أول مقاس أدناه.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr><th>المقاس</th><th>السعر</th><th>قبل الخصم</th><th>المخزون</th><th>SKU</th><th>الحالة</th><th></th></tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const lvl = stockLevel(v.stock_quantity);
                return (
                  <tr key={v.id}>
                    <td className="font-medium">{Number(v.size)} {v.unit}</td>
                    <td className="tabular-nums">{formatPrice(v.price)}</td>
                    <td className="tabular-nums text-ink-500">{v.compare_at_price ? formatPrice(v.compare_at_price) : '—'}</td>
                    <td>
                      <span className="tabular-nums">{v.stock_quantity}</span>{' '}
                      <Badge tone={lvl === 'OUT_OF_STOCK' ? 'danger' : lvl === 'LOW_STOCK' ? 'warning' : 'success'}>
                        {STOCK_LEVEL_LABELS_AR[lvl]}
                      </Badge>
                    </td>
                    <td className="font-mono text-xs text-ink-500">{v.sku ?? '—'}</td>
                    <td>{v.active ? <Badge tone="success">مفعّل</Badge> : <Badge>معطّل</Badge>}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <form action={setVariantActive}>
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="product_id" value={productId} />
                          <input type="hidden" name="active" value={v.active ? '' : 'on'} />
                          <button className="admin-btn-sm" type="submit">{v.active ? 'تعطيل' : 'تفعيل'}</button>
                        </form>
                        <form action={deleteVariant}>
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="product_id" value={productId} />
                          <DangerButton label="حذف" />
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit existing variants (collapsible per row) */}
      {variants.map((v) => (
        <details key={v.id} className="rounded border border-ink/10 p-3">
          <summary className="cursor-pointer text-sm text-ink-600">تعديل مقاس {Number(v.size)} {v.unit}</summary>
          <div className="mt-4">
            <EntityForm action={updateVariant} submitLabel="حفظ المقاس">
              <input type="hidden" name="id" value={v.id} />
              <input type="hidden" name="product_id" value={productId} />
              <div className="grid gap-4 md:grid-cols-3">
                <NumberField name="size" label="المقاس" required defaultValue={Number(v.size)} step="0.01" min={0} />
                <TextField name="unit" label="الوحدة" defaultValue={v.unit} />
                <NumberField name="position" label="الترتيب" defaultValue={v.position} min={0} />
                <NumberField name="price" label="السعر (د.ل)" required defaultValue={Number(v.price)} step="0.001" min={0} />
                <NumberField name="compare_at_price" label="سعر قبل الخصم" defaultValue={v.compare_at_price ? Number(v.compare_at_price) : undefined} step="0.001" min={0} />
                <NumberField name="weight_grams" label="الوزن (غرام)" defaultValue={v.weight_grams ?? undefined} min={0} />
                <TextField name="sku" label="SKU" defaultValue={v.sku} />
                <TextField name="barcode" label="الباركود" defaultValue={v.barcode} />
              </div>
              <p className="admin-hint">المخزون يُدار من صفحة «المخزون» ليبقى سجل الحركة كاملًا.</p>
              <CheckboxField name="active" label="مفعّل" defaultChecked={v.active} />
            </EntityForm>
          </div>
        </details>
      ))}

      {/* Add a new variant */}
      <details className="rounded border border-dashed border-ink/20 p-3">
        <summary className="cursor-pointer text-sm font-medium text-gold-700">+ إضافة مقاس جديد</summary>
        <div className="mt-4">
          <EntityForm action={createVariant} submitLabel="إضافة المقاس">
            <input type="hidden" name="product_id" value={productId} />
            <div className="grid gap-4 md:grid-cols-3">
              <NumberField name="size" label="المقاس" required step="0.01" min={0} placeholder="50" />
              <TextField name="unit" label="الوحدة" defaultValue="ml" />
              <NumberField name="stock_quantity" label="المخزون الافتتاحي" defaultValue={0} min={0} />
              <NumberField name="price" label="السعر (د.ل)" required step="0.001" min={0} />
              <NumberField name="compare_at_price" label="سعر قبل الخصم" step="0.001" min={0} />
              <NumberField name="weight_grams" label="الوزن (غرام)" min={0} />
              <TextField name="sku" label="SKU" />
              <TextField name="barcode" label="الباركود" />
            </div>
          </EntityForm>
        </div>
      </details>
    </section>
  );
}
