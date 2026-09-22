import { ProductCard } from '@/components/product/ProductCard';
import type { ProductCard as ProductCardType } from '@/types';

export function ProductGrid({ products }: { products: ProductCardType[] }) {
  if (products.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
