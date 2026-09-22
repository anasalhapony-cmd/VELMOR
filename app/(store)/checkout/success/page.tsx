'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Copy, Package } from 'lucide-react';
import { formatPrice } from '@/lib/utils/money';
import { ORDER_STATUS_LABELS_AR } from '@/config/constants';
import type { OrderPublic } from '@/types';

export default function SuccessPage() {
  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('velmor-last-order');
      if (raw) setOrder(JSON.parse(raw) as OrderPublic);
    } catch {
      /* ignore */
    }
  }, []);

  if (!order) {
    return (
      <div className="container-content grid place-items-center py-24 text-center">
        <Package size={44} className="text-ink/20" />
        <h1 className="mt-4 font-display-ar text-h2 font-medium">لا يوجد طلب لعرضه</h1>
        <p className="mt-2 text-ink-500">لتتبع طلب سابق، استخدم صفحة تتبع الطلب.</p>
        <Link href="/track-order" className="btn-primary mt-6">تتبع الطلب</Link>
      </div>
    );
  }

  function copyNumber() {
    navigator.clipboard?.writeText(order!.order_number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="container-content max-w-2xl py-16">
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 size={56} className="text-success" />
        <h1 className="mt-4 font-display-ar text-h1 font-medium">تم استلام طلبك!</h1>
        <p className="mt-2 text-ink-500">سنتواصل معك لتأكيد الطلب. الدفع عند الاستلام.</p>

        <div className="mt-6 flex items-center gap-3 rounded-lg border border-ink/15 bg-paper-200 px-5 py-3">
          <span className="text-sm text-ink-500">رقم الطلب</span>
          <span className="font-mono text-lg font-semibold tracking-wider">{order.order_number}</span>
          <button onClick={copyNumber} aria-label="نسخ" className="text-ink-500 hover:text-ink">
            <Copy size={16} />
          </button>
          {copied && <span className="text-xs text-success">تم النسخ</span>}
        </div>
        <span className="mt-3 rounded-full bg-ink px-3 py-1 text-xs text-paper">
          {ORDER_STATUS_LABELS_AR[order.status]}
        </span>
      </div>

      <div className="mt-10 rounded-lg border border-ink/10 p-6">
        <ul className="flex flex-col divide-y divide-ink/10">
          {order.items.map((it, i) => (
            <li key={i} className="flex items-center justify-between gap-2 py-3 text-sm">
              <span className="text-ink-600">
                {it.name} {it.variant && <span className="text-ink-500">({it.variant})</span>} ×{it.quantity}
              </span>
              <span className="font-medium">{formatPrice(it.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 flex flex-col gap-2 border-t border-ink/10 pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-ink-500">المجموع الفرعي</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          {Number(order.discount_total) > 0 && (
            <div className="flex justify-between text-success"><dt>الخصم</dt><dd>− {formatPrice(order.discount_total)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-ink-500">التوصيل</dt><dd>{formatPrice(order.delivery_fee)}</dd></div>
          <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-semibold"><dt>الإجمالي</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/track-order" className="btn-primary">تتبع الطلب</Link>
        <Link href="/products" className="btn-outline">متابعة التسوق</Link>
      </div>
    </div>
  );
}
