import type { Metadata } from 'next';
import Link from 'next/link';
import { getDeliveryZones } from '@/lib/cms/queries';
import { getSettings, settingBool } from '@/lib/settings';
import { CheckoutForm } from '@/components/store/checkout/CheckoutForm';
import { Icon } from '@/components/store/ui';

export const metadata: Metadata = { title: 'إتمام الطلب', robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const [zones, settings] = await Promise.all([getDeliveryZones(), getSettings()]);
  const deliveryEnabled = settingBool(settings, 'delivery_enabled', true);

  return (
    <div className="vp-page vp-page--paper">
      <header className="vp-page__head vp-wrap">
        <p className="vp-eyebrow">الخطوة الأخيرة</p>
        <h1 className="vp-page__title">إتمام الطلب</h1>
      </header>
      <div className="vp-wrap">
        {!deliveryEnabled || zones.length === 0 ? (
          <div className="vp-empty vp-empty--light">
            <h2>الطلبات عبر الموقع متوقفة مؤقتًا</h2>
            <p>يمكنك الطلب مباشرة عبر واتساب، أو العودة لاحقًا.</p>
            <Link href="/products" className="vp-btn vp-btn--ink">
              <span>تصفّح العطور</span>
              <Icon name="arrow" size={18} />
            </Link>
          </div>
        ) : (
          <CheckoutForm
            zones={zones.map((z) => ({ id: z.id, name: z.name, city: z.city, fee: Number(z.fee) }))}
            giftWrapEnabled={settingBool(settings, 'gift_wrapping_enabled', false)}
          />
        )}
      </div>
    </div>
  );
}
