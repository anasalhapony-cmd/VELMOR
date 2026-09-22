'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Price } from '@/components/ui/Price';
import { Rating } from '@/components/ui/Rating';
import { useWishlist } from '@/stores/wishlist-store';
import { GENDER_LABELS_AR } from '@/config/constants';
import { cn } from '@/lib/utils/cn';
import type { ProductCard as ProductCardType } from '@/types';

export function ProductCard({ product, priority = false }: { product: ProductCardType; priority?: boolean }) {
  const inWishlist = useWishlist((s) => s.ids.has(product.id));
  const toggle = useWishlist((s) => s.toggle);

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden rounded bg-paper-200">
        <Link href={`/products/${product.slug}`} aria-label={product.nameAr || product.name}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.nameAr || product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              priority={priority}
              className="object-cover transition-transform duration-700 ease-velmor group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center font-display text-2xl text-ink/20">VELMOR</div>
          )}
        </Link>

        {/* badges */}
        <div className="pointer-events-none absolute start-2 top-2 flex flex-col gap-1">
          {product.isNew && (
            <span className="rounded-sm bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-paper">
              جديد
            </span>
          )}
          {product.isBestSeller && (
            <span className="rounded-sm bg-gold px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink">
              الأكثر مبيعًا
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggle(product.id)}
          aria-pressed={inWishlist}
          aria-label={inWishlist ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
          className="absolute end-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-paper/90 text-ink backdrop-blur transition-colors hover:bg-paper"
        >
          <Heart size={16} className={cn(inWishlist && 'fill-danger text-danger')} />
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        {product.brand && <span className="eyebrow">{product.brand}</span>}
        <Link
          href={`/products/${product.slug}`}
          className="font-display-ar text-base font-medium leading-snug text-ink"
        >
          {product.nameAr || product.name}
        </Link>
        {product.gender && (
          <span className="text-xs text-ink-500">{GENDER_LABELS_AR[product.gender]}</span>
        )}
        <div className="mt-1 flex items-center justify-between gap-2">
          <Price price={product.minPrice} compareAt={product.compareAtPrice} size="sm" />
          {product.ratingCount > 0 && <Rating value={product.ratingAvg} count={product.ratingCount} showCount={false} />}
        </div>
      </div>
    </article>
  );
}
