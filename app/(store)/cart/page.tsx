'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/stores/cart-store';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { formatPrice } from '@/lib/utils/money';

export default function CartPage() {
  const { items, setQuantity, remove, subtotal } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="container-content py-16" />;

  if (items.length === 0) {
    return (
      <div className="container-content grid place-items-center py-24 text-center">
        <ShoppingBag size={48} className="text-ink/20" />
        <h1 className="mt-4 font-display-ar text-h2 font-medium">سلتك فارغة</h1>
        <p className="mt-2 text-ink-500">اكتشف مجموعتنا من العطور الفاخرة.</p>
        <Link href="/products" className="btn-primary mt-6">تسوّق الآن</Link>
      </div>
    );
  }

  return (
    <div className="container-content py-10">
      <h1 className="mb-8 font-display-ar text-h1 font-medium">سلة التسوق</h1>
      <div className="grid gap-10 lg:grid-cols-3">
        <ul className="lg:col-span-2 flex flex-col divide-y divide-ink/10">
          {items.map((it) => (
            <li key={it.variantId} className="flex gap-4 py-5">
              <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded bg-paper-200">
                {it.image && <Image src={it.image} alt={it.name} fill sizes="96px" className="object-cover" />}
              </div>
              <div className="flex flex-1 flex-col">
                <Link href={`/products/${it.slug}`} className="font-medium">{it.name}</Link>
                <span className="text-sm text-ink-500">{it.size} {it.unit}</span>
                <span className="mt-1 text-sm">{formatPrice(it.price)}</span>
                <div className="mt-auto flex items-center justify-between">
                  <QuantityStepper value={it.quantity} onChange={(n) => setQuantity(it.variantId, n)} />
                  <button onClick={() => remove(it.variantId)} className="text-ink-500 hover:text-danger" aria-label="حذف">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="font-medium">{formatPrice(it.price * it.quantity)}</div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-lg border border-ink/10 p-6">
          <h2 className="mb-4 font-display-ar text-h3 font-medium">ملخص الطلب</h2>
          <div className="flex items-center justify-between border-b border-ink/10 pb-3 text-sm">
            <span className="text-ink-500">المجموع الفرعي</span>
            <span className="font-medium">{formatPrice(subtotal())}</span>
          </div>
          <p className="py-3 text-xs text-ink-500">تُحسب رسوم التوصيل والخصومات عند الدفع.</p>
          <Link href="/checkout" className="btn-primary w-full">إتمام الطلب</Link>
          <Link href="/products" className="mt-3 block text-center text-sm text-ink-500 underline">متابعة التسوق</Link>
        </aside>
      </div>
    </div>
  );
}
