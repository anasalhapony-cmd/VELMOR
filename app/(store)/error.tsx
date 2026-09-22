'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/** Storefront error boundary (§91): never shows a raw stack to customers. */
export default function StoreError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[storefront] error boundary:', error);
  }, [error]);

  return (
    <div className="container-content grid min-h-[50vh] place-items-center py-16 text-center">
      <div>
        <h1 className="font-display-ar text-h2 font-medium">حدث خطأ غير متوقع</h1>
        <p className="mt-2 text-ink-500">نعتذر، تعذّر تحميل هذا المحتوى. حاول مرة أخرى.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="btn-primary">إعادة المحاولة</button>
          <Link href="/" className="btn-outline">الصفحة الرئيسية</Link>
        </div>
      </div>
    </div>
  );
}
