'use client';

import { useState } from 'react';
import { Loader2, PackageSearch } from 'lucide-react';
import { formatPrice } from '@/lib/utils/money';
import { formatDateTime } from '@/lib/utils/format';
import { ORDER_STATUS_LABELS_AR, ORDER_STATUSES } from '@/config/constants';
import type { OrderPublic } from '@/types';

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber, phone }),
      });
      const data = await res.json();
      if (res.ok && data.order) setOrder(data.order);
      else setError(data.error ?? 'لم يتم العثور على الطلب.');
    } catch {
      setError('حدث خطأ في الشبكة.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-content max-w-2xl py-12">
      <div className="mb-8 text-center">
        <PackageSearch size={40} className="mx-auto text-gold-700" />
        <h1 className="mt-3 font-display-ar text-h1 font-medium">تتبع الطلب</h1>
        <p className="mt-2 text-ink-500">أدخل رقم الطلب ورقم هاتفك لعرض حالة طلبك.</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg border border-ink/10 p-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">رقم الطلب</span>
          <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="VEL-XXXXXX" dir="ltr" className="input" required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">رقم الهاتف</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09XXXXXXXX" dir="ltr" inputMode="tel" className="input" required />
        </label>
        {error && <p className="rounded bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'تتبّع'}
        </button>
      </form>

      {order && <OrderResult order={order} />}
    </div>
  );
}

function OrderResult({ order }: { order: OrderPublic }) {
  const reached = new Set(order.timeline.map((t) => t.status));
  const flow = ORDER_STATUSES.filter((s) => !['FAILED', 'EXPIRED', 'CANCELLED'].includes(s));
  const cancelled = order.status === 'CANCELLED' || order.status === 'FAILED' || order.status === 'EXPIRED';

  return (
    <div className="mt-8 rounded-lg border border-ink/10 p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-lg font-semibold tracking-wider">{order.order_number}</span>
        <span className="rounded-full bg-ink px-3 py-1 text-xs text-paper">{ORDER_STATUS_LABELS_AR[order.status]}</span>
      </div>

      {!cancelled ? (
        <ol className="mt-6 flex flex-col gap-0">
          {flow.map((s) => {
            const done = reached.has(s) || order.status === s;
            const at = order.timeline.find((t) => t.status === s)?.at;
            return (
              <li key={s} className="flex items-start gap-3 pb-5 last:pb-0">
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${done ? 'bg-success text-white' : 'border border-ink/20 text-transparent'}`}>✓</span>
                <div>
                  <p className={done ? 'font-medium' : 'text-ink-500'}>{ORDER_STATUS_LABELS_AR[s]}</p>
                  {at && <p className="text-xs text-ink-500">{formatDateTime(at)}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 rounded bg-danger/10 p-3 text-sm text-danger">
          حالة الطلب: {ORDER_STATUS_LABELS_AR[order.status]}
        </p>
      )}

      <ul className="mt-6 flex flex-col divide-y divide-ink/10 border-t border-ink/10">
        {order.items.map((it, i) => (
          <li key={i} className="flex justify-between py-2 text-sm">
            <span className="text-ink-600">{it.name} ×{it.quantity}</span>
            <span className="font-medium">{formatPrice(it.line_total)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-between border-t border-ink/10 pt-3 font-semibold">
        <span>الإجمالي</span>
        <span>{formatPrice(order.total)}</span>
      </div>
    </div>
  );
}
