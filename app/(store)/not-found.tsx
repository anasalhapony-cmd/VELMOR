import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-content grid place-items-center py-28 text-center">
      <p className="font-display text-6xl text-gold">404</p>
      <h1 className="mt-4 font-display-ar text-h2 font-medium">الصفحة غير موجودة</h1>
      <p className="mt-2 text-ink-500">ربما تم نقل الصفحة أو لم تعد متوفرة.</p>
      <Link href="/" className="btn-primary mt-6">العودة للرئيسية</Link>
    </div>
  );
}
