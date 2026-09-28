'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/** Storefront error boundary: never shows raw errors or stacks to customers. */
export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[storefront] error boundary', error.digest ?? '');
  }, [error]);
  return (
    <div className="vp-page vp-page--ink">
      <div className="vp-wrap vp-empty">
        <h1>حدث خطأ غير متوقع</h1>
        <p>تعذّر تحميل هذا الجزء الآن. أعد المحاولة بعد لحظة.</p>
        <div className="vp-empty__ctas">
          <button type="button" onClick={reset} className="vp-btn vp-btn--gold">
            <span>إعادة المحاولة</span>
          </button>
          <Link href="/" className="vp-btn vp-btn--ghost">
            <span>الرئيسية</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
