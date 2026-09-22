import { getRail } from '@/lib/products/queries';
import { ProductCard } from '@/components/product/ProductCard';
import { SectionHeading } from '@/components/home/SectionHeading';

export async function ProductRail({
  flag,
  title,
  eyebrow,
  href,
}: {
  flag: 'featured' | 'new' | 'best';
  title: string;
  eyebrow?: string;
  href: string;
}) {
  const products = await getRail(flag, 8);
  if (products.length === 0) return null;

  return (
    <section className="container-content py-section">
      <SectionHeading eyebrow={eyebrow} title={title} href={href} />
      {/* horizontal scroll on mobile, grid on larger screens */}
      <div className="-mx-gutter flex gap-4 overflow-x-auto px-gutter pb-2 no-scrollbar md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {products.map((p, i) => (
          <div key={p.id} className="w-48 shrink-0 md:w-auto">
            <ProductCard product={p} priority={i < 4} />
          </div>
        ))}
      </div>
    </section>
  );
}
