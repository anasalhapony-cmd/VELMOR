/** Route transition state in the brand language (the curtain covers most transitions). */
export default function StoreLoading() {
  return (
    <div className="vp-loading" role="status" aria-live="polite">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/brand/logo-gold.webp" alt="" width={200} height={88} />
      <span className="vp-sr">جارٍ التحميل…</span>
    </div>
  );
}
