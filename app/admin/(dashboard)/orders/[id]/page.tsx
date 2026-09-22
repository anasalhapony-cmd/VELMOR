import { notFound } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { requirePermission, getAdminIdentity } from '@/lib/admin/auth';
import { hasPermission } from '@/lib/admin/permissions';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, OrderStatusPill, Badge } from '@/components/admin/ui';
import { EntityForm, SelectField, TextareaField, CheckboxField, type Option } from '@/components/admin/form';
import { formatPrice } from '@/lib/utils/money';
import { formatDateTime } from '@/lib/utils/format';
import { whatsappUrl } from '@/lib/utils/format';
import {
  ORDER_STATUSES, ORDER_STATUS_LABELS_AR, ORDER_STATUS_TRANSITIONS, type OrderStatus,
} from '@/config/constants';
import { changeStatus, saveInternalNote } from '../actions';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('view_orders');
  const me = await getAdminIdentity();
  const canManage = me ? hasPermission(me, 'manage_orders') : false;
  const isOwner = me?.role === 'owner';
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
  if (!order) notFound();

  const [{ data: items }, { data: history }] = await Promise.all([
    supabase.from('order_items').select('*').eq('order_id', id).order('created_at', { ascending: true }),
    supabase.from('order_status_history').select('*').eq('order_id', id).order('created_at', { ascending: true }),
  ]);

  const current = order.order_status;
  const validNext = ORDER_STATUS_TRANSITIONS[current] ?? [];
  const statusOptions: Option[] = (isOwner ? ORDER_STATUSES.filter((s) => s !== current) : validNext).map((s) => ({
    value: s,
    label: ORDER_STATUS_LABELS_AR[s as OrderStatus],
  }));

  const waMessage = `مرحبًا ${order.customer_name}، بخصوص طلبك رقم ${order.public_order_number} من VELMOR.`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`طلب ${order.public_order_number}`}
        description={formatDateTime(order.created_at)}
        backHref="/admin/orders"
        action={<OrderStatusPill status={current} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items + totals */}
        <div className="space-y-6 lg:col-span-2">
          <section className="admin-card overflow-x-auto">
            <h2 className="mb-3 font-medium text-ink">المنتجات</h2>
            <table className="admin-table">
              <thead><tr><th>المنتج</th><th>المقاس</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
              <tbody>
                {(items ?? []).map((it) => (
                  <tr key={it.id}>
                    <td className="font-medium">{it.product_name_snapshot}</td>
                    <td>{it.variant_name_snapshot ?? '—'}</td>
                    <td className="tabular-nums">{it.quantity}</td>
                    <td className="tabular-nums">{formatPrice(it.unit_price_snapshot)}</td>
                    <td className="tabular-nums">{formatPrice(it.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-4 space-y-1 border-t border-ink/10 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-ink-500">المجموع الفرعي</dt><dd className="tabular-nums">{formatPrice(order.subtotal)}</dd></div>
              {Number(order.discount_total) > 0 && (
                <div className="flex justify-between text-success"><dt>الخصم {order.coupon_code ? `(${order.coupon_code})` : ''}</dt><dd className="tabular-nums">-{formatPrice(order.discount_total)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-ink-500">التوصيل {order.delivery_zone_name ? `(${order.delivery_zone_name})` : ''}</dt><dd className="tabular-nums">{formatPrice(order.delivery_fee)}</dd></div>
              <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-semibold"><dt>الإجمالي</dt><dd className="tabular-nums">{formatPrice(order.total)}</dd></div>
            </dl>
          </section>

          {/* Status change */}
          {canManage && (
            <section className="admin-card">
              <h2 className="mb-3 font-medium text-ink">تغيير الحالة</h2>
              {statusOptions.length === 0 ? (
                <p className="text-sm text-ink-500">لا توجد انتقالات متاحة من هذه الحالة.</p>
              ) : (
                <EntityForm action={changeStatus} submitLabel="تحديث الحالة">
                  <input type="hidden" name="id" value={order.id} />
                  <SelectField name="to" label="الحالة الجديدة" required options={statusOptions} includeBlank="— اختر —" />
                  <TextareaField name="note" label="ملاحظة (اختيارية)" rows={2} />
                  {isOwner && (
                    <CheckboxField name="override" label="تجاوز قواعد الانتقال (للمالك)" hint="استخدمه فقط عند الضرورة؛ يُسجَّل في سجل التدقيق." />
                  )}
                </EntityForm>
              )}
            </section>
          )}
        </div>

        {/* Customer + timeline + internal note */}
        <div className="space-y-6">
          <section className="admin-card">
            <h2 className="mb-3 font-medium text-ink">العميل</h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-ink-500">الاسم</dt><dd>{order.customer_name}</dd></div>
              <div><dt className="text-ink-500">الهاتف</dt><dd dir="ltr" className="font-mono">{order.phone}</dd></div>
              {order.whatsapp && <div><dt className="text-ink-500">واتساب</dt><dd dir="ltr" className="font-mono">{order.whatsapp}</dd></div>}
              <div><dt className="text-ink-500">العنوان</dt><dd>{order.city}{order.area ? `، ${order.area}` : ''} — {order.address}</dd></div>
              {order.delivery_note && <div><dt className="text-ink-500">ملاحظة التوصيل</dt><dd>{order.delivery_note}</dd></div>}
              <div className="flex gap-2 pt-1">
                <Badge tone="neutral">{order.payment_method}</Badge>
                <Badge tone={order.payment_status === 'PAID' ? 'success' : 'neutral'}>{order.payment_status}</Badge>
              </div>
            </dl>
            <a href={whatsappUrl(order.whatsapp || order.phone, waMessage)} target="_blank" rel="noreferrer" className="btn-gold mt-4 w-full justify-center">
              <MessageCircle size={16} /> مراسلة عبر واتساب
            </a>
          </section>

          <section className="admin-card">
            <h2 className="mb-3 font-medium text-ink">مسار الحالة</h2>
            <ol className="space-y-3">
              {(history ?? []).map((h) => (
                <li key={h.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  <div>
                    <p>{ORDER_STATUS_LABELS_AR[h.to_status]}</p>
                    <p className="text-xs text-ink-500">{formatDateTime(h.created_at)}</p>
                    {h.note && <p className="text-xs text-ink-600">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {canManage && (
            <section className="admin-card">
              <h2 className="mb-3 font-medium text-ink">ملاحظة داخلية</h2>
              <form action={saveInternalNote} className="space-y-3">
                <input type="hidden" name="id" value={order.id} />
                <textarea name="internal_note" rows={3} defaultValue={order.internal_note ?? ''} className="admin-input" placeholder="ملاحظة للفريق فقط — لا تظهر للعميل." />
                <button type="submit" className="btn-outline w-full justify-center">حفظ الملاحظة</button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
