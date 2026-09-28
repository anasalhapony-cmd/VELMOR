import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage } from '@/lib/cms/queries';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: 'غير موجود', robots: { index: false } };
  return {
    title: page.seo_title || page.title,
    description: page.seo_description || undefined,
    alternates: { canonical: `/pages/${slug}` },
    robots: page.noindex ? { index: false } : undefined,
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  // Only approved + active pages are served (RLS + query). Unapproved => 404.
  if (!page) notFound();
  return (
    <article className="vp-page vp-page--paper">
      <header className="vp-page__head vp-wrap">
        <p className="vp-eyebrow">VELMOR</p>
        <h1 className="vp-page__title">{page.title}</h1>
      </header>
      <div className="vp-wrap">
        {page.is_placeholder && <p className="vp-form-msg">هذه صفحة مبدئية وسيُحدَّث محتواها قريبًا.</p>}
        <div className="vp-prose">{page.body}</div>
      </div>
    </article>
  );
}
