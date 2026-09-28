import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug, getRelated } from '@/lib/products/queries';
import { listApprovedReviews } from '@/lib/reviews/queries';
import { getSettings, settingBool, settingString } from '@/lib/settings';
import { DEFAULT_WHATSAPP } from '@/config/site';
import { CONCENTRATION_LABELS_AR, GENDER_LABELS_AR, OCCASION_LABELS_AR, SEASON_LABELS_AR } from '@/config/constants';
import { formatDate } from '@/lib/utils/format';
import { Gallery } from '@/components/store/product/Gallery';
import { BuyPanel } from '@/components/store/product/BuyPanel';
import { ReviewForm } from '@/components/store/product/ReviewForm';
import { ProductTile } from '@/components/store/commerce/ProductTile';
import { TrackView } from '@/components/analytics/TrackView';
import { Icon, Pips } from '@/components/store/ui';
import { shortName } from '@/components/store/home/sections';
import { productJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'غير موجود', robots: { index: false } };
  const title = product.seoTitle || `${product.nameAr || product.name} — عطر ${product.familyName ?? ''}`.trim();
  const description = product.seoDescription || product.shortDescription || product.description || undefined;
  const image = product.images[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { type: 'website', title, description, images: image ? [image] : undefined },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
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
  const whatsapp = settingString(settings, 'whatsapp_number', DEFAULT_WHATSAPP);
  const name = product.nameAr || product.name;
  const word = shortName(product);
  const tiers = [
    { key: 'top', ar: 'الافتتاحية', en: 'Top', notes: product.notes.top, line: 'أول ما تلتقطه — الانطباع الأول.' },
    { key: 'heart', ar: 'القلب', en: 'Heart', notes: product.notes.heart, line: 'بعد دقائق — الطابع الحقيقي.' },
    { key: 'base', ar: 'القاعدة', en: 'Base', notes: product.notes.base, line: 'لساعات — ما يبقى بعد رحيلك.' },
  ].filter((t) => t.notes.length > 0);

  const jsonLd = productJsonLd(product);
  const breadcrumb = breadcrumbJsonLd([
    { name: 'الرئيسية', url: '/' },
    { name: 'العطور', url: '/products' },
    { name, url: `/products/${product.slug}` },
  ]);

  return (
    <div className="vp-pdp">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, '\\u003c') }} />
      <TrackView event="product_view" productId={product.id} />

      <section className="vp-pdp__top">
        <div className="vp-pdp__gal">
          <Gallery images={product.images} name={name} word={word} field={product.artField} />
        </div>
        <div className="vp-pdp__info">
          <nav className="vp-crumbs" aria-label="مسار التصفح">
            <Link href="/">الرئيسية</Link>
            <span aria-hidden="true">/</span>
            <Link href="/products">العطور</Link>
            {product.familySlug && (
              <>
                <span aria-hidden="true">/</span>
                <Link href={`/products?families=${product.familySlug}`}>{product.familyName}</Link>
              </>
            )}
          </nav>
          <p className="vp-eyebrow vp-eyebrow--gold" data-reveal="mask">
            {[product.familyName, product.concentration ? CONCENTRATION_LABELS_AR[product.concentration] : null]
              .filter(Boolean)
              .join(' · ') || 'VELMOR'}
          </p>
          <h1 className="vp-pdp__name" data-reveal="mask">
            <span>{name}</span>
          </h1>
          <p className="vp-pdp__latin" dir="ltr" data-reveal="up">
            {product.name}
          </p>
          {product.ratingCount > 0 && (
            <a href="#reviews" className="vp-pdp__rating" aria-label={`التقييم ${product.ratingAvg.toFixed(1)} من 5 — ${product.ratingCount} تقييم`}>
              <span className="vp-review__stars" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={n <= Math.round(product.ratingAvg) ? 'is-on' : ''}>
                    <Icon name="star" size={15} />
                  </span>
                ))}
              </span>
              <span>
                {product.ratingAvg.toFixed(1)} · {product.ratingCount} تقييم
              </span>
            </a>
          )}
          {product.shortDescription && <p className="vp-pdp__short">{product.shortDescription}</p>}
          {product.inspirationProfile && (
            <div className="vp-pdp__profile">
              <span>الطابع</span>
              <p>{product.inspirationProfile}</p>
              <small>تفسير مستقل بتوقيع VELMOR — لا علاقة تجارية بأي دار عطور أخرى.</small>
            </div>
          )}
          <BuyPanel product={product} whatsapp={whatsapp} />
        </div>
      </section>

      {tiers.length > 0 && (
        <section className="vp-notes" aria-labelledby="vp-notes-title">
          <div className="vp-wrap">
            <div className="vp-notes__head">
              <p className="vp-eyebrow vp-eyebrow--gold" data-reveal="mask">
                الهرم العطري
              </p>
              <h2 id="vp-notes-title" className="vp-h2" data-reveal="mask">
                <span>كيف يتطوّر {word} على بشرتك.</span>
              </h2>
            </div>
            <ol className="vp-notes__tiers" data-stagger>
              {tiers.map((t) => (
                <li key={t.key} data-reveal="up">
                  <p className="vp-eyebrow vp-eyebrow--gold">
                    {t.ar} <span dir="ltr">· {t.en}</span>
                  </p>
                  <ul>
                    {t.notes.map((n) => (
                      <li key={n.slug}>
                        <Link href={`/products?notes=${n.slug}`}>
                          <b>{n.name}</b>
                          {n.nameEn ? <span dir="ltr">{n.nameEn}</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <small>{t.line}</small>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <section className="vp-facts" aria-labelledby="vp-facts-title">
        <div className="vp-wrap vp-facts__grid">
          <div>
            <h2 id="vp-facts-title" className="vp-eyebrow" data-reveal="mask">
              عن العطر
            </h2>
            {product.description && (
              <p className="vp-facts__desc" data-reveal="up">
                {product.description}
              </p>
            )}
          </div>
          <dl className="vp-facts__list" data-reveal="up">
            {product.longevity ? (
              <div>
                <dt className="vp-sr">الثبات</dt>
                <dd>
                  <Pips value={product.longevity} label="الثبات" />
                </dd>
              </div>
            ) : null}
            {product.sillage ? (
              <div>
                <dt className="vp-sr">الفوحان</dt>
                <dd>
                  <Pips value={product.sillage} label="الفوحان" />
                </dd>
              </div>
            ) : null}
            {product.gender && (
              <div className="vp-facts__row">
                <dt>الفئة</dt>
                <dd>{GENDER_LABELS_AR[product.gender]}</dd>
              </div>
            )}
            {product.season && (
              <div className="vp-facts__row">
                <dt>الموسم</dt>
                <dd>{SEASON_LABELS_AR[product.season]}</dd>
              </div>
            )}
            {product.occasions.length > 0 && (
              <div className="vp-facts__row">
                <dt>المناسبة</dt>
                <dd>{product.occasions.map((o) => OCCASION_LABELS_AR[o]).join('، ')}</dd>
              </div>
            )}
            {product.concentration && (
              <div className="vp-facts__row">
                <dt>التركيز</dt>
                <dd>{CONCENTRATION_LABELS_AR[product.concentration]}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      <section className="vp-previews" id="reviews" aria-labelledby="vp-rv-title">
        <div className="vp-wrap vp-previews__grid">
          <div>
            <div className="vp-previews__head">
              <h2 id="vp-rv-title" className="vp-h2 vp-h2--ink">
                آراء العملاء
              </h2>
              {product.ratingCount > 0 && (
                <p className="vp-previews__avg">
                  <b dir="ltr">{product.ratingAvg.toFixed(1)}</b> من 5 · {product.ratingCount} تقييم
                </p>
              )}
            </div>
            {reviews.length === 0 ? (
              <p className="vp-previews__none">لا توجد تقييمات منشورة بعد. كن أول من يشاركنا رأيه.</p>
            ) : (
              <ul className="vp-previews__list">
                {reviews.map((r) => (
                  <li key={r.id}>
                    <div className="vp-review__stars" role="img" aria-label={`${r.rating} من 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={n <= r.rating ? 'is-on' : ''}>
                          <Icon name="star" size={15} />
                        </span>
                      ))}
                    </div>
                    {r.title && <h3>{r.title}</h3>}
                    {r.body && <p>{r.body}</p>}
                    <small>
                      {r.displayName} · {formatDate(r.createdAt)}
                      {r.isVerified ? <em> · مشترٍ موثّق</em> : null}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>{reviewsEnabled ? <ReviewForm productId={product.id} /> : <p className="vp-previews__none">التقييمات غير متاحة حاليًا.</p>}</div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="vp-related" aria-labelledby="vp-related-title">
          <div className="vp-wrap">
            <div className="vp-related__head">
              <p className="vp-eyebrow vp-eyebrow--gold">من نفس العائلة</p>
              <h2 id="vp-related-title" className="vp-h2">
                قد يشبهك أيضًا.
              </h2>
            </div>
            <div className="vp-cat__grid vp-related__grid">
              {related.map((p, i) => (
                <ProductTile key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
