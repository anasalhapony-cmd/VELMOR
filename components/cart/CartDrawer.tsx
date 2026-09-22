'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/stores/cart-store';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { formatPrice } from '@/lib/utils/money';

export function CartDrawer() {
  const { items, isOpen, close, setQuantity, remove, subtotal } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // lock scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="سلة التسوق">
      <div className="absolute inset-0 bg-ink/40" onClick={close} />
      <div className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-paper shadow-xl">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h2 className="font-display-ar text-lg font-medium">السلة ({items.reduce((n, i) => n + i.quantity, 0)})</h2>
          <button onClick={close} aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag size={40} className="text-ink/20" />
            <p className="text-ink-500">سلتك فارغة</p>
            <Link href="/products" onClick={close} className="btn-primary">
              تسوّق العطور
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="flex flex-col divide-y divide-ink/10">
                {items.map((it) => (
                  <li key={it.variantId} className="flex gap-3 py-4">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded bg-paper-200">
                      {it.image && <Image src={it.image} alt={it.name} fill sizes="64px" className="object-cover" />}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <Link href={`/products/${it.slug}`} onClick={close} className="text-sm font-medium leading-snug">
                        {it.name}
                      </Link>
                      <span className="text-xs text-ink-500">
                        {it.size} {it.unit}
                      </span>
                      <div className="mt-auto flex items-center justify-between">
                        <QuantityStepper value={it.quantity} onChange={(n) => setQuantity(it.variantId, n)} />
                        <button onClick={() => remove(it.variantId)} aria-label="حذف" className="text-ink-500 hover:text-danger">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm font-medium">{formatPrice(it.price * it.quantity)}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-ink/10 px-5 py-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-ink-500">المجموع الفرعي</span>
                <span className="font-medium">{formatPrice(subtotal())}</span>
              </div>
              <p className="mb-3 text-xs text-ink-500">تُحسب رسوم التوصيل عند الدفع.</p>
              <Link href="/checkout" onClick={close} className="btn-primary w-full">
                إتمام الطلب
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
