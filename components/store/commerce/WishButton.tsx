'use client';

import { useWishlist } from '@/stores/wishlist-store';
import { trackEvent } from '@/lib/analytics/client';
import { Icon } from '@/components/store/ui';

/** Real, device-persisted wishlist toggle (optimistic; reverts on failure). */
export function WishButton({ productId, name, className = 'vp-pcard__wish' }: { productId: string; name: string; className?: string }) {
  const on = useWishlist((s) => s.ids.has(productId));
  const toggle = useWishlist((s) => s.toggle);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={on}
      aria-label={on ? `إزالة ${name} من المفضلة` : `أضف ${name} إلى المفضلة`}
      onClick={() => {
        trackEvent(on ? 'wishlist_remove' : 'wishlist_add', { productId });
        void toggle(productId);
      }}
    >
      <Icon name="heart" size={18} />
    </button>
  );
}
