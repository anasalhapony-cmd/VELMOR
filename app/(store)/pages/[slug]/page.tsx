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
    robots: page.noindex ? { index: false } : undefined,
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  // Only approved + active pages are served (RLS + query). Unapproved => 404.
  if (!page) notFound();

  return (
    <article className="container-content max-w-prose py-14">
      <h1 className="font-display-ar text-h1 font-medium">{page.title}</h1>
      {page.is_placeholder && (
        <p className="mt-4 rounded bg-warning/10 p-3 text-sm text-warning">
          هذه صفحة مبدئية وسيتم تحديث محتواها قريبًا.
        </p>
      )}
      <div className="mt-6 whitespace-pre-line leading-loose text-ink-700">{page.body}</div>
    </article>
  );
}
