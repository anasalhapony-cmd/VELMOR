import Link from 'next/link';
import { Icon } from '@/components/store/ui';

export default function NotFound() {
  return (
    <div className="vp-page vp-page--ink vp-404">
      <div className="vp-wrap vp-empty">
        <span className="vp-404__num" dir="ltr" aria-hidden="true">
          404
        </span>
        <h1>هذه الصفحة غادرت قبلك.</h1>
        <p>ربما نُقلت أو لم تعد متوفرة. عطرك التالي ما زال هنا.</p>
        <div className="vp-empty__ctas">
          <Link href="/" className="vp-btn vp-btn--gold">
            <span>الرئيسية</span>
            <Icon name="arrow" size={18} />
          </Link>
          <Link href="/products" className="vp-btn vp-btn--ghost">
            <span>كل العطور</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
