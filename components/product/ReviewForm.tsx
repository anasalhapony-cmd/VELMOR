'use client';

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { trackEvent } from '@/lib/analytics/client';

export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setMessage('يرجى اختيار تقييم بالنجوم.');
      return;
    }
    setStatus('sending');
    setMessage('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          rating,
          title: title || undefined,
          body: body || undefined,
          display_name: name || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('done');
        setMessage(data.message ?? 'شكرًا لتقييمك!');
        trackEvent('review_submitted', { productId });
      } else {
        setStatus('idle');
        setMessage(data.error ?? 'تعذّر إرسال التقييم.');
      }
    } catch {
      setStatus('idle');
      setMessage('حدث خطأ في الشبكة.');
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center text-success">
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg border border-ink/10 p-6">
      <h3 className="font-display-ar text-h3 font-medium">أضف تقييمك</h3>
      <div className="flex items-center gap-1" role="radiogroup" aria-label="التقييم">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${i} نجوم`}
            aria-checked={rating === i}
            role="radio"
          >
            <Star size={26} className={cn((hover || rating) >= i ? 'fill-gold text-gold' : 'text-ink/20')} />
          </button>
        ))}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="الاسم (اختياري)"
        maxLength={60}
        className="rounded border border-ink/20 px-3 py-2 text-sm outline-none focus:border-gold"
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="عنوان مختصر (اختياري)"
        maxLength={120}
        className="rounded border border-ink/20 px-3 py-2 text-sm outline-none focus:border-gold"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="اكتب رأيك في العطر…"
        maxLength={1500}
        rows={4}
        className="rounded border border-ink/20 px-3 py-2 text-sm outline-none focus:border-gold"
      />
      {message && <p className="text-sm text-danger">{message}</p>}
      <button type="submit" disabled={status === 'sending'} className="btn-primary self-start">
        {status === 'sending' ? <Loader2 size={16} className="animate-spin" /> : 'إرسال التقييم'}
      </button>
      <p className="text-xs text-ink-500">تُراجَع التقييمات قبل نشرها.</p>
    </form>
  );
}
