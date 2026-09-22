import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug, getRelated } from '@/lib/products/queries';
import { listApprovedReviews } from '@/lib/reviews/queries';
import { getSettings, settingBool } from '@/lib/settings';
import { ProductGallery } from '@/components/product/ProductGallery';
import { BuyBox } from '@/components/product/BuyBox';
import { ProductAttributes } from '@/components/product/ProductAttributes';
import { FragrancePyramid } from '@/components/product/FragrancePyramid';
import { ProductReviews } from '@/components/product/ProductReviews';
import { ProductGrid } from '@/components/product/ProductGrid';
import { SectionHeading } from '@/components/home/SectionHeading';
import { TrackView } from '@/components/analytics/TrackView';
import { productJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'غير موجود' };
  const title = product.seoTitle || `${product.nameAr || product.name}`;
  const description =
    product.seoDescription || product.shortDescription || product.description || undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.images[0]?.url ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, reviews, settings] = await Promise.all([
    getRelated(product, 4),
    listApprovedReviews(product.id, 20),
    getSettings(),
  ]);
  const reviewsEnabled = settingBool(settings, 'reviews_enabled', true);

  const jsonLd = productJsonLd(product);
  const breadcrumb = breadcrumbJsonLd([
    { name: 'الرئيسية', url: '/' },
    { name: 'العطور', url: '/products' },
    { name: product.nameAr || product.name, url: `/products/${product.slug}` },
  ]);

  return (
    <div className="container-content py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <TrackView event="product_viewed" productId={product.id} />

      <nav className="mb-6 flex items-center gap-2 text-xs text-ink-500" aria-label="مسار التصفح">
        <Link href="/" className="hover:text-ink">الرئيسية</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-ink">العطور</Link>
        <span>/</span>
        <span className="text-ink">{product.nameAr || product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.nameAr || product.name} />
        <BuyBox product={product} />
      </div>

      {product.description && (
        <section className="mt-section max-w-prose">
          <SectionHeading title="عن العطر" />
          <p className="whitespace-pre-line leading-loose text-ink-600">{product.description}</p>
        </section>
      )}

      <section className="mt-section">
        <SectionHeading title="المكوّنات العطرية" />
        <FragrancePyramid notes={product.notes} />
      </section>

      <section className="mt-section">
        <SectionHeading title="الخصائص" />
        <ProductAttributes product={product} />
      </section>

      <div className="mt-section">
        <ProductReviews
          productId={product.id}
          reviews={reviews}
          ratingAvg={product.ratingAvg}
          ratingCount={product.ratingCount}
          enabled={reviewsEnabled}
        />
      </div>

      {related.length > 0 && (
        <section className="mt-section">
          <SectionHeading title="قد يعجبك أيضًا" />
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
