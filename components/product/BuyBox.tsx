'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, Loader2 } from 'lucide-react';
import { Price } from '@/components/ui/Price';
import { StockBadge } from '@/components/ui/StockBadge';
import { Rating } from '@/components/ui/Rating';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { useCart } from '@/stores/cart-store';
import { useWishlist } from '@/stores/wishlist-store';
import { trackEvent } from '@/lib/analytics/client';
import { cn } from '@/lib/utils/cn';
import type { ProductDetail } from '@/types';

export function BuyBox({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const openCart = useCart((s) => s.open);
  const inWishlist = useWishlist((s) => s.ids.has(product.id));
  const toggleWishlist = useWishlist((s) => s.toggle);

  const available = product.variants.filter((v) => v.active);
  const firstInStock = available.find((v) => v.stockLevel !== 'OUT_OF_STOCK') ?? available[0];
  const [variantId, setVariantId] = useState(firstInStock?.id);
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState(false);

  const selected = useMemo(() => available.find((v) => v.id === variantId), [available, variantId]);
  const soldOut = !selected || selected.stockLevel === 'OUT_OF_STOCK';

  function buildItem() {
    if (!selected) return null;
    return {
      variantId: selected.id,
      productId: product.id,
      slug: product.slug,
      name: product.nameAr || product.name,
      size: selected.size,
      unit: selected.unit,
      price: selected.price,
      image: product.images[0]?.url ?? null,
      quantity: qty,
    };
  }

  function onAdd() {
    const item = buildItem();
    if (!item) return;
    add(item);
    trackEvent('add_to_cart', { productId: product.id, meta: { qty } });
    openCart();
  }

  function onBuyNow() {
    const item = buildItem();
    if (!item) return;
    setPending(true);
    add(item);
    trackEvent('add_to_cart', { productId: product.id, meta: { qty, buy_now: true } });
    router.push('/checkout');
  }

  function onToggleWishlist() {
    if (!inWishlist) trackEvent('wishlist_added', { productId: product.id });
    toggleWishlist(product.id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        {product.brand && <span className="eyebrow">{product.brand}</span>}
        <h1 className="mt-1 font-display-ar text-h1 font-medium leading-tight">
          {product.nameAr || product.name}
        </h1>
        {product.name && product.nameAr && (
          <p className="mt-1 font-display text-sm uppercase tracking-widest text-ink-500">{product.name}</p>
        )}
        {product.ratingCount > 0 && (
          <div className="mt-3">
            <Rating value={product.ratingAvg} count={product.ratingCount} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Price price={selected?.price ?? product.variants[0]?.price ?? null} compareAt={selected?.compareAtPrice} size="lg" />
      </div>

      {product.shortDescription && <p className="text-ink-600">{product.shortDescription}</p>}

      {/* size selector */}
      <div>
        <span className="mb-2 block text-sm font-medium">الحجم</span>
        <div className="flex flex-wrap gap-2">
          {available.map((v) => {
            const out = v.stockLevel === 'OUT_OF_STOCK';
            return (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                disabled={out}
                className={cn(
                  'rounded border px-4 py-2 text-sm transition-colors',
                  v.id === variantId ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-ink hover:border-ink',
                  out && 'cursor-not-allowed opacity-40 line-through'
                )}
              >
                {v.size} {v.unit}
              </button>
            );
          })}
        </div>
      </div>

      {selected && <StockBadge level={selected.stockLevel} />}

      {/* quantity + actions */}
      <div className="flex items-center gap-3">
        <QuantityStepper value={qty} onChange={setQty} disabled={soldOut} />
        <button onClick={onAdd} disabled={soldOut} className="btn-primary flex-1">
          <ShoppingBag size={18} />
          {soldOut ? 'غير متوفر' : 'أضف إلى السلة'}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onBuyNow} disabled={soldOut || pending} className="btn-gold flex-1">
          {pending ? <Loader2 size={18} className="animate-spin" /> : 'اشترِ الآن'}
        </button>
        <button
          onClick={onToggleWishlist}
          aria-pressed={inWishlist}
          aria-label={inWishlist ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
          className="grid h-12 w-12 place-items-center rounded border border-ink/20 hover:border-ink"
        >
          <Heart size={18} className={cn(inWishlist && 'fill-danger text-danger')} />
        </button>
      </div>
    </div>
  );
}
