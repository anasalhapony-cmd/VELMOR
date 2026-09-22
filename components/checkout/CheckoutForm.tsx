'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Truck, Wallet } from 'lucide-react';
import { useCart } from '@/stores/cart-store';
import { checkoutFormSchema, type CheckoutFormValues } from '@/lib/validation/schemas';
import { formatPrice } from '@/lib/utils/money';
import { trackEvent } from '@/lib/analytics/client';
import type { Quote } from '@/types';

interface Zone {
  id: string;
  name: string;
  city: string;
  fee: number;
}

export function CheckoutForm({ zones }: { zones: Zone[] }) {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const idempotencyKey = useRef<string>('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: { delivery_zone_id: '' },
  });

  useEffect(() => {
    setMounted(true);
    idempotencyKey.current = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    trackEvent('checkout_started');
  }, []);

  const zoneId = watch('delivery_zone_id');
  const couponCode = watch('coupon_code');

  const cartItems = useMemo(
    () => items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
    [items]
  );

  // Recompute the server quote whenever the zone changes (delivery fee is authoritative).
  useEffect(() => {
    if (!mounted || items.length === 0 || !zoneId) {
      setQuote(null);
      return;
    }
    let active = true;
    fetch('/api/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: cartItems, delivery_zone_id: zoneId, coupon_code: couponCode || undefined }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.quote) setQuote(d.quote as Quote);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, mounted, cartItems.length]);

  async function applyCoupon() {
    if (!couponCode || !zoneId) {
      setCouponMsg({ ok: false, text: 'اختر منطقة التوصيل أولًا.' });
      return;
    }
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: cartItems, delivery_zone_id: zoneId, coupon_code: couponCode }),
    });
    const data = await res.json();
    if (data?.coupon?.valid) {
      setCouponMsg({ ok: true, text: `تم تطبيق الخصم: ${formatPrice(data.discount)}` });
      setQuote((q) => (q ? { ...q, discount: data.discount, total: data.total } : q));
    } else {
      setCouponMsg({ ok: false, text: 'الكوبون غير صالح لهذا الطلب.' });
    }
  }

  async function onSubmit(values: CheckoutFormValues) {
    if (items.length === 0) return;
    setSubmitting(true);
    setServerError('');
    const zone = zones.find((z) => z.id === values.delivery_zone_id);
    const payload = {
      customer_name: values.customer_name,
      phone: values.phone,
      whatsapp: values.whatsapp || undefined,
      city: zone?.city ?? 'بنغازي',
      area: zone?.name,
      address: values.address,
      delivery_note: values.delivery_note || undefined,
      delivery_zone_id: values.delivery_zone_id,
      coupon_code: values.coupon_code || undefined,
      payment_method: 'COD' as const,
      items: cartItems,
    };
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-idempotency-key': idempotencyKey.current },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 201 && data.order) {
        try {
          sessionStorage.setItem('velmor-last-order', JSON.stringify(data.order));
        } catch {
          /* ignore */
        }
        clear();
        router.push('/checkout/success');
        return;
      }
      setServerError(data.error ?? 'تعذّر إنشاء الطلب.');
      setSubmitting(false);
    } catch {
      setServerError('حدث خطأ في الشبكة. حاول مرة أخرى.');
      setSubmitting(false);
    }
  }

  if (mounted && items.length === 0) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed border-ink/20 py-20 text-center">
        <p className="text-ink-500">سلتك فارغة.</p>
        <Link href="/products" className="btn-primary mt-4">تسوّق الآن</Link>
      </div>
    );
  }

  const displaySubtotal = quote?.subtotal ?? subtotal();
  const displayFee = quote?.delivery_fee ?? (zones.find((z) => z.id === zoneId)?.fee ?? 0);
  const displayDiscount = quote?.discount ?? 0;
  const displayTotal = quote?.total ?? Math.max(0, displaySubtotal - displayDiscount + displayFee);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-10 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-8">
        {/* customer */}
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 font-display-ar text-h3 font-medium">بيانات المستلم</legend>
          <Field label="الاسم الكامل" error={errors.customer_name?.message}>
            <input {...register('customer_name')} className="input" autoComplete="name" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="رقم الهاتف" error={errors.phone?.message}>
              <input {...register('phone')} inputMode="tel" dir="ltr" placeholder="09XXXXXXXX" className="input" />
            </Field>
            <Field label="واتساب (اختياري)" error={errors.whatsapp?.message}>
              <input {...register('whatsapp')} inputMode="tel" dir="ltr" placeholder="09XXXXXXXX" className="input" />
            </Field>
          </div>
        </fieldset>

        {/* delivery */}
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 font-display-ar text-h3 font-medium">التوصيل</legend>
          <Field label="منطقة التوصيل" error={errors.delivery_zone_id?.message}>
            <select {...register('delivery_zone_id')} className="input">
              <option value="">اختر المنطقة…</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.city} — {z.name} ({formatPrice(z.fee)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="العنوان التفصيلي" error={errors.address?.message}>
            <textarea {...register('address')} rows={2} className="input" placeholder="أقرب نقطة دالة، اسم الشارع…" />
          </Field>
          <Field label="ملاحظة للتوصيل (اختياري)" error={errors.delivery_note?.message}>
            <input {...register('delivery_note')} className="input" />
          </Field>
        </fieldset>

        {/* payment */}
        <fieldset>
          <legend className="mb-3 font-display-ar text-h3 font-medium">طريقة الدفع</legend>
          <div className="flex items-center gap-3 rounded-lg border border-ink bg-ink/5 p-4">
            <Wallet className="text-gold-700" />
            <div>
              <p className="font-medium">الدفع عند الاستلام</p>
              <p className="text-sm text-ink-500">ادفع نقدًا عند استلام طلبك.</p>
            </div>
          </div>
        </fieldset>
      </div>

      {/* summary */}
      <aside className="h-fit rounded-lg border border-ink/10 p-6 lg:sticky lg:top-20">
        <h2 className="mb-4 font-display-ar text-h3 font-medium">ملخص الطلب</h2>
        <ul className="mb-4 flex flex-col gap-3">
          {items.map((it) => (
            <li key={it.variantId} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink-600">
                {it.name} <span className="text-ink-500">({it.size}{it.unit}) ×{it.quantity}</span>
              </span>
              <span className="shrink-0 font-medium">{formatPrice(it.price * it.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <input {...register('coupon_code')} placeholder="كوبون الخصم" className="input flex-1" />
          <button type="button" onClick={applyCoupon} className="btn-outline shrink-0">تطبيق</button>
        </div>
        {couponMsg && (
          <p className={`mt-2 text-xs ${couponMsg.ok ? 'text-success' : 'text-danger'}`}>{couponMsg.text}</p>
        )}

        <dl className="mt-4 flex flex-col gap-2 border-t border-ink/10 pt-4 text-sm">
          <Row label="المجموع الفرعي" value={formatPrice(displaySubtotal)} />
          {displayDiscount > 0 && <Row label="الخصم" value={`− ${formatPrice(displayDiscount)}`} accent />}
          <Row label="رسوم التوصيل" value={zoneId ? formatPrice(displayFee) : 'تُحدد بالمنطقة'} />
          <div className="mt-2 flex items-center justify-between border-t border-ink/10 pt-3 text-base font-semibold">
            <span>الإجمالي</span>
            <span>{formatPrice(displayTotal)}</span>
          </div>
        </dl>

        {serverError && <p className="mt-4 rounded bg-danger/10 p-3 text-sm text-danger">{serverError}</p>}

        <button type="submit" disabled={submitting} className="btn-primary mt-6 w-full">
          {submitting ? <Loader2 size={18} className="animate-spin" /> : 'تأكيد الطلب'}
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-500">
          <Truck size={14} /> الدفع عند الاستلام · توصيل داخل بنغازي
        </p>
      </aside>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className={accent ? 'font-medium text-success' : 'font-medium'}>{value}</dd>
    </div>
  );
}
