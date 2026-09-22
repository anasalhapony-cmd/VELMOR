import Link from 'next/link';
import { getBlock } from '@/lib/cms/queries';
import { Logo } from '@/components/ui/Logo';

export async function Hero() {
  const block = await getBlock('hero');
  const title = block?.title ?? 'عطرٌ يُشبه حضورك';
  const subtitle = block?.subtitle ?? 'أناقة بحضور وثقة';
  const body = block?.body ?? 'مجموعة VELMOR للرجال — توازن بين الفخامة والجرأة.';
  const ctaLabel = block?.cta_label ?? 'اكتشف العطور';
  const ctaHref = block?.cta_href ?? '/products';

  return (
    <section className="relative overflow-hidden bg-ink text-paper">
      {/* subtle pine-to-ink wash — restrained, no cheap gradients */}
      <div className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: 'radial-gradient(120% 100% at 85% 0%, #2E3A31 0%, #1B1714 55%)' }} />
      <div className="container-content relative grid gap-8 py-20 md:min-h-[72vh] md:grid-cols-2 md:items-center md:py-28">
        <div className="max-w-xl">
          <span className="eyebrow text-gold-300">{subtitle}</span>
          <h1 className="mt-4 font-display-ar text-display font-semibold leading-[1.05] text-paper">
            {title}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-paper/75">{body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={ctaHref} className="btn-gold">
              {ctaLabel}
            </Link>
            <Link href="/finder" className="btn-outline border-paper/40 text-paper hover:bg-paper hover:text-ink">
              مستشار العطور
            </Link>
          </div>
        </div>

        <div className="relative hidden md:flex md:items-center md:justify-center">
          <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-lg border border-paper/10 bg-ink-800">
            <div className="absolute inset-0 grid place-items-center">
              <Logo variant="gold" width={260} height={90} href={null} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
