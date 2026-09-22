import type { Metadata } from 'next';
import { getGuestId } from '@/lib/security/guest';
import { getWishlist } from '@/lib/wishlist/queries';
import { WishlistGrid } from '@/components/wishlist/WishlistGrid';

export const metadata: Metadata = { title: 'قائمة الأمنيات', robots: { index: false } };

export default async function WishlistPage() {
  const deviceId = await getGuestId();
  const products = deviceId ? await getWishlist(deviceId) : [];
  return (
    <div className="container-content py-10">
      <h1 className="mb-8 font-display-ar text-h1 font-medium">قائمة الأمنيات</h1>
      <WishlistGrid initial={products} />
    </div>
  );
}
