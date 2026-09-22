import { createClient } from '@/lib/supabase/server';
import { Rating } from '@/components/ui/Rating';
import { SectionHeading } from '@/components/home/SectionHeading';

/** Social proof — a few recent approved reviews across products. */
export async function ReviewsSection() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('reviews')
    .select('id, rating, title, body, display_name, created_at')
    .eq('status', 'APPROVED')
    .order('created_at', { ascending: false })
    .limit(6);

  const reviews = data ?? [];
  if (reviews.length === 0) return null;

  return (
    <section className="bg-paper-200 py-section">
      <div className="container-content">
        <SectionHeading eyebrow="آراء العملاء" title="ماذا يقول عملاؤنا" />
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.map((r) => (
            <figure key={r.id} className="flex flex-col rounded-lg border border-ink/10 bg-paper p-6">
              <Rating value={r.rating} showCount={false} />
              {r.title && <figcaption className="mt-3 font-medium">{r.title}</figcaption>}
              {r.body && <blockquote className="mt-1 text-sm leading-relaxed text-ink-600">{r.body}</blockquote>}
              <span className="mt-auto pt-4 text-xs text-ink-500">— {r.display_name || 'زبون'}</span>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
