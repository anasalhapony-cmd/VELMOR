'use client';

import { useState } from 'react';
import { Icon } from '@/components/store/ui';

/** Review submission → always PENDING until moderated. Optional proof of purchase. */
export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [message, setMessage] = useState('');
  const [proof, setProof] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (rating < 1) {
      setMessage('اختر تقييمك بالنجوم أولًا.');
      return;
    }
    setStatus('sending');
    setMessage('');
    const str = (k: string) => {
      const v = String(fd.get(k) ?? '').trim();
      return v || undefined;
    };
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          rating,
          title: str('title'),
          body: str('body'),
          display_name: str('display_name'),
          order_number: proof ? str('order_number') : undefined,
          phone: proof ? str('phone') : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (res.ok) {
        setStatus('done');
        setMessage(data.message ?? 'شكرًا لك! سيظهر تقييمك بعد المراجعة.');
      } else {
        setStatus('idle');
        setMessage(data.error ?? 'تعذّر إرسال التقييم. حاول مرة أخرى.');
      }
    } catch {
      setStatus('idle');
      setMessage('تعذّر الاتصال. تحقّق من الشبكة وحاول مجددًا.');
    }
  }

  if (status === 'done') {
    return (
      <div className="vp-rform vp-rform--done" role="status">
        <Icon name="check" size={26} />
        <p>{message}</p>
      </div>
    );
  }

  return (
    <form className="vp-rform" onSubmit={submit} noValidate>
      <h3>شاركنا رأيك</h3>
      <div className="vp-rform__stars" role="radiogroup" aria-label="التقييم" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} من 5`}
            className={(hover || rating) >= n ? 'is-on' : ''}
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
          >
            <Icon name="star" size={24} />
          </button>
        ))}
      </div>
      <div className="vp-field">
        <label htmlFor="rv-name">الاسم الظاهر (اختياري)</label>
        <input id="rv-name" name="display_name" maxLength={60} autoComplete="nickname" />
      </div>
      <div className="vp-field">
        <label htmlFor="rv-title">العنوان (اختياري)</label>
        <input id="rv-title" name="title" maxLength={120} />
      </div>
      <div className="vp-field">
        <label htmlFor="rv-body">تجربتك مع العطر</label>
        <textarea id="rv-body" name="body" rows={4} maxLength={1500} />
      </div>
      <label className="vp-check">
        <input type="checkbox" checked={proof} onChange={(e) => setProof(e.target.checked)} />
        <span>اشتريته من VELMOR — أضف شارة «مشترٍ موثّق»</span>
      </label>
      {proof && (
        <div className="vp-rform__proof">
          <div className="vp-field">
            <label htmlFor="rv-order">رقم الطلب</label>
            <input id="rv-order" name="order_number" dir="ltr" placeholder="VEL-XXXXXX" maxLength={20} />
          </div>
          <div className="vp-field">
            <label htmlFor="rv-phone">الهاتف المستخدم في الطلب</label>
            <input id="rv-phone" name="phone" dir="ltr" inputMode="tel" placeholder="09XXXXXXXX" maxLength={20} />
          </div>
        </div>
      )}
      {message && (
        <p className="vp-form-msg" role="alert">
          {message}
        </p>
      )}
      <button type="submit" className="vp-btn vp-btn--ink" disabled={status === 'sending'}>
        <span>{status === 'sending' ? 'جارٍ الإرسال…' : 'إرسال التقييم'}</span>
      </button>
      <p className="vp-rform__note">تظهر التقييمات بعد مراجعتها من فريقنا.</p>
    </form>
  );
}
