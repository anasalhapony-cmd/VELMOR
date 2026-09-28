'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils/money';
import { formatDateTime } from '@/lib/utils/format';
import { ORDER_STATUS_LABELS_AR, type OrderStatus } from '@/config/constants';
import { Icon } from '@/components/store/ui';
import type { OrderPublic } from '@/types';

const PATH: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const TERMINAL: OrderStatus[] = ['CANCELLED', 'EXPIRED', 'FAILED'];

/**
 * Tracking requires BOTH the order number and the phone used at checkout; the
 * server returns only the safe public projection (no address, no notes).
 */
export function TrackOrder({ initialNumber }: { initialNumber: string }) {
  const [orderNumber, setOrderNumber] = useState(initialNumber);
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber.trim(), phone: phone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.order) setOrder(data.order as OrderPublic);
      else setError(data.error ?? 'لم نعثر على الطلب. تحقّق من الرقم والهاتف.');
    } catch {
      setError('تعذّر الاتصال. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  const reached = new Map((order?.timeline ?? []).map((t) => [t.status, t.at]));
  const terminal = order && TERMINAL.includes(order.status) ? order.status : null;
  const currentIdx = order ? PATH.indexOf(order.status) : -1;

  return (
    <div className="vp-page vp-page--ink vp-track">
      <div className="vp-wrap vp-track__grid">
        <div>
          <p className="vp-eyebrow vp-eyebrow--gold">تتبّع الطلب</p>
          <h1 className="vp-page__title">أين طلبك الآن؟</h1>
          <p className="vp-track__lead">أدخل رقم الطلب (مثل VEL-7K4P2X) ورقم الهاتف الذي استخدمته عند الطلب.</p>
          <form className="vp-track__form" onSubmit={submit} noValidate>
            <div className="vp-field vp-field--dark">
              <label htmlFor="tr-num">رقم الطلب</label>
              <input
                id="tr-num"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                placeholder="VEL-XXXXXX"
                dir="ltr"
                autoComplete="off"
                required
                maxLength={20}
              />
            </div>
            <div className="vp-field vp-field--dark">
              <label htmlFor="tr-phone">رقم الهاتف</label>
              <input
                id="tr-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09XXXXXXXX"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                required
                maxLength={20}
              />
            </div>
            <button type="submit" className="vp-btn vp-btn--gold" disabled={loading || !orderNumber || !phone}>
              <span>{loading ? 'جارٍ البحث…' : 'تتبّع'}</span>
              {!loading && <Icon name="arrow" size={18} />}
            </button>
            {error && (
              <p className="vp-form-msg" role="alert">
                {error}
              </p>
            )}
          </form>
        </div>

        <div aria-live="polite">
          {order ? (
            <div className="vp-track__card">
              <header>
                <span dir="ltr">{order.order_number}</span>
                <b className={terminal ? 'is-terminal' : ''}>{ORDER_STATUS_LABELS_AR[order.status]}</b>
              </header>
              <ol className="vp-timeline">
                {PATH.map((s, i) => {
                  const at = reached.get(s);
                  const state = terminal ? (at ? 'done' : 'off') : i < currentIdx ? 'done' : i === currentIdx ? 'now' : 'next';
                  return (
                    <li key={s} className={`is-${state}`}>
                      <i aria-hidden="true" />
                      <span>{ORDER_STATUS_LABELS_AR[s]}</span>
                      {at && <time dateTime={at}>{formatDateTime(at)}</time>}
                    </li>
                  );
                })}
                {terminal && (
                  <li className="is-terminal">
                    <i aria-hidden="true" />
                    <span>{ORDER_STATUS_LABELS_AR[terminal]}</span>
                    {reached.get(terminal) && <time dateTime={reached.get(terminal)!}>{formatDateTime(reached.get(terminal)!)}</time>}
                  </li>
                )}
              </ol>
              <ul className="vp-track__items">
                {order.items.map((it, i) => (
                  <li key={i}>
                    <span>
                      {it.name} <small>{it.variant} × {it.quantity}</small>
                    </span>
                    <em>{formatPrice(it.line_total)}</em>
                  </li>
                ))}
              </ul>
              <p className="vp-track__total">
                الإجمالي عند الاستلام: <b>{formatPrice(order.total)}</b>
              </p>
            </div>
          ) : (
            <div className="vp-track__placeholder" aria-hidden="true">
              <span className="vp-script">on its way</span>
            </div>
          )}
          <p className="vp-track__help">
            تحتاج مساعدة؟ <Link href="/faq" className="vp-link">الأسئلة الشائعة</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
