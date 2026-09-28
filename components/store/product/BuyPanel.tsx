'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/stores/cart-store';
import { trackEvent } from '@/lib/analytics/client';
import { formatPrice } from '@/lib/utils/money';
import { whatsappUrl } from '@/lib/utils/format';
import { AddToBag, unitAr } from '@/components/store/commerce/AddToBag';
import { WishButton } from '@/components/store/commerce/WishButton';
import { Icon } from '@/components/store/ui';
import type { ProductDetail } from '@/types';

const STOCK_TEXT = { IN_STOCK: 'متوفر', LOW_STOCK: 'كمية محدودة', OUT_OF_STOCK: 'نفد من المخزون' } as const;

export function BuyPanel({ product, whatsapp }: { product: ProductDetail; whatsapp: string }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const variants = product.variants;
  const first = variants.find((v) => v.stockLevel !== 'OUT_OF_STOCK') ?? variants[0];
  const [variantId, setVariantId] = useState(first?.id);
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState(false);
  const selected = useMemo(() => variants.find((v) => v.id === variantId) ?? first, [variants, variantId, first]);
  const soldOut = !selected || selected.stockLevel === 'OUT_OF_STOCK';
  const name = product.nameAr || product.name;
  const image = product.images[0]?.url ?? null;

  function buyNow() {
    if (!selected || soldOut) return;
    setPending(true);
    add({
      variantId: selected.id,
      productId: product.id,
      slug: product.slug,
      name,
      size: selected.size,
      unit: selected.unit,
      price: selected.price,
      image,
      quantity: qty,
    });
    trackEvent('add_to_cart', { productId: product.id, meta: { variant: selected.id, qty, buy_now: true } });
    router.push('/checkout');
  }

  const waText = selected
    ? `مرحبًا VELMOR، أريد طلب ${name} (${product.name}) — ${selected.size} ${unitAr(selected.unit)} × ${qty}.`
    : `مرحبًا VELMOR، أريد الاستفسار عن ${name}.`;

  return (
    <div className="vp-buy">
      <div className="vp-buy__price" aria-live="polite">
        <b>{selected ? formatPrice(selected.price) : '—'}</b>
        {selected?.compareAtPrice && selected.compareAtPrice > selected.price ? (
          <s>
            <span className="vp-sr">بدلًا من </span>
            {formatPrice(selected.compareAtPrice)}
          </s>
        ) : null}
      </div>

      {variants.length > 0 && (
        <fieldset className="vp-buy__sizes">
          <legend>الحجم</legend>
          <div role="radiogroup" aria-label="الحجم">
            {variants.map((v) => {
              const out = v.stockLevel === 'OUT_OF_STOCK';
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={v.id === selected?.id}
                  className={`${v.id === selected?.id ? 'is-active' : ''}${out ? ' is-out' : ''}`}
                  onClick={() => setVariantId(v.id)}
                  disabled={out}
                >
                  <b>
                    {v.size} {unitAr(v.unit)}
                  </b>
                  <small>{out ? 'نفد' : formatPrice(v.price)}</small>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {selected && (
        <p className={`vp-stock vp-stock--${selected.stockLevel.toLowerCase()}`}>
          <i aria-hidden="true" /> {STOCK_TEXT[selected.stockLevel]}
        </p>
      )}

      <div className="vp-buy__row">
        <div className="vp-qty vp-qty--dark" role="group" aria-label="الكمية">
          <button type="button" aria-label="إنقاص" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || soldOut}>
            <Icon name="minus" size={14} />
          </button>
          <span aria-live="polite">{qty}</span>
          <button type="button" aria-label="زيادة" onClick={() => setQty((q) => Math.min(10, q + 1))} disabled={qty >= 10 || soldOut}>
            <Icon name="plus" size={14} />
          </button>
        </div>
        <AddToBag
          className="vp-btn vp-btn--gold vp-buy__add"
          product={{ id: product.id, slug: product.slug, name, image }}
          variant={selected}
          quantity={qty}
          label="أضف إلى السلة"
          openDrawer
        />
        <WishButton productId={product.id} name={name} className="vp-buy__wish" />
      </div>

      <div className="vp-buy__row">
        <button type="button" className="vp-btn vp-btn--ghost vp-btn--block" onClick={buyNow} disabled={soldOut || pending}>
          <span>{pending ? 'جارٍ التحويل…' : 'اشترِ الآن'}</span>
        </button>
      </div>
      <a className="vp-buy__wa" href={whatsappUrl(whatsapp, waText)} target="_blank" rel="noopener noreferrer">
        <Icon name="whatsapp" size={18} />
        <span>اطلب عبر واتساب</span>
      </a>
      <ul className="vp-buy__perks">
        <li>
          <Icon name="cash" size={16} /> الدفع عند الاستلام
        </li>
        <li>
          <Icon name="truck" size={16} /> توصيل منزلي — الرسوم حسب منطقتك
        </li>
      </ul>
    </div>
  );
}
