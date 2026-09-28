import type { Metadata } from 'next';
import { getGuestId } from '@/lib/security/guest';
import { getWishlist } from '@/lib/wishlist/queries';
import { WishlistView } from '@/components/store/commerce/WishlistView';

export const metadata: Metadata = { title: 'المفضلة', robots: { index: false, follow: false } };

export default async function WishlistPage() {
  const deviceId = await getGuestId();
  const products = deviceId ? await getWishlist(deviceId) : [];
  return (
    <div className="vp-page vp-page--paper">
      <header className="vp-page__head vp-wrap">
        <p className="vp-eyebrow">محفوظة على هذا الجهاز</p>
        <h1 className="vp-page__title">المفضلة</h1>
      </header>
      <div className="vp-wrap">
        <WishlistView initial={products} />
      </div>
    </div>
  );
}
