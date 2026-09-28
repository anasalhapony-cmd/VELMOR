'use client';

import { useState } from 'react';
import { useCart } from '@/stores/cart-store';
import { useToast } from '@/stores/toast-store';
import { trackEvent } from '@/lib/analytics/client';
import { Icon } from '@/components/store/ui';
import type { StockLevel } from '@/config/constants';

export interface BagProduct {
  id: string;
  slug: string;
  name: string; // display name (Arabic first)
  image: string | null;
}
export interface BagVariant {
  id: string;
  size: number;
  unit: string;
  price: number;
  stockLevel: StockLevel;
}

/**
 * Adds a real line to the persisted guest cart. The price stored here is for
 * display only — checkout re-prices every line on the server.
 */
export function AddToBag({
  product,
  variant,
  quantity = 1,
  className = 'vp-rcard__add',
  label,
  openDrawer = false,
  compact = false,
}: {
  product: BagProduct;
  variant: BagVariant | undefined;
  quantity?: number;
  className?: string;
  label?: string;
  openDrawer?: boolean;
  compact?: boolean;
}) {
  const add = useCart((s) => s.add);
  const open = useCart((s) => s.open);
  const toast = useToast((s) => s.show);
  const [added, setAdded] = useState(false);
  const soldOut = !variant || variant.stockLevel === 'OUT_OF_STOCK';

  function onClick() {
    if (!variant || soldOut) return;
    add({
      variantId: variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      size: variant.size,
      unit: variant.unit,
      price: variant.price,
      image: product.image,
      quantity,
    });
    trackEvent('add_to_cart', { productId: product.id, meta: { variant: variant.id, qty: quantity } });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
    if (openDrawer) open();
    else toast(`أُضيف ${product.name} (${variant.size} ${unitAr(variant.unit)}) إلى السلة`, { action: { label: 'عرض السلة', href: '/cart' } });
  }

  const text = soldOut
    ? 'نفد من المخزون'
    : added
      ? 'أُضيف إلى السلة'
      : (label ?? (compact ? 'إضافة' : `أضف إلى السلة — ${variant!.size} ${unitAr(variant!.unit)}`));

  return (
    <button
      type="button"
      className={`${className}${added ? ' is-added' : ''}`}
      onClick={onClick}
      disabled={soldOut}
      aria-live="polite"
    >
      <Icon name={added ? 'check' : soldOut ? 'close' : compact ? 'bag' : 'plus'} size={16} />
      <span>{text}</span>
    </button>
  );
}

export function unitAr(unit: string): string {
  return unit === 'ml' ? 'مل' : unit;
}
