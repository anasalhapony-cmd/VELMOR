'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import { useWishlist } from '@/stores/wishlist-store';
import type { ProductCard as ProductCardType } from '@/types';

export function WishlistGrid({ initial }: { initial: ProductCardType[] }) {
  const ids = useWishlist((s) => s.ids);
  const hydrated = useWishlist((s) => s.hydrated);
  // Once the store is hydrated, respect it (so removals disappear immediately).
  const products = hydrated ? initial.filter((p) => ids.has(p.id)) : initial;

  if (products.length === 0) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <Heart size={44} className="text-ink/20" />
        <h1 className="mt-4 font-display-ar text-h2 font-medium">قائمة أمنياتك فارغة</h1>
        <p className="mt-2 text-ink-500">أضف العطور التي تعجبك لحفظها هنا.</p>
        <Link href="/products" className="btn-primary mt-6">تصفّح العطور</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
