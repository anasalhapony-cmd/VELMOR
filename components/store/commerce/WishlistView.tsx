'use client';

import Link from 'next/link';
import { useWishlist } from '@/stores/wishlist-store';
import { ProductTile } from '@/components/store/commerce/ProductTile';
import { Icon } from '@/components/store/ui';
import type { ProductCard } from '@/types';

export function WishlistView({ initial }: { initial: ProductCard[] }) {
  const ids = useWishlist((s) => s.ids);
  const hydrated = useWishlist((s) => s.hydrated);
  // Once hydrated, removals disappear immediately (source of truth: server).
  const products = hydrated ? initial.filter((p) => ids.has(p.id)) : initial;

  if (products.length === 0) {
    return (
      <div className="vp-empty vp-empty--light">
        <span className="vp-script" aria-hidden="true">
          wishlist
        </span>
        <h2>لم تحفظ أي عطر بعد</h2>
        <p>اضغط على القلب في أي عطر لحفظه هنا.</p>
        <Link href="/products" className="vp-btn vp-btn--ink" data-transition>
          <span>تصفّح العطور</span>
          <Icon name="arrow" size={18} />
        </Link>
      </div>
    );
  }
  return (
    <div className="vp-cat__grid">
      {products.map((p, i) => (
        <ProductTile key={p.id} product={p} index={i} priority={i < 4} />
      ))}
    </div>
  );
}
