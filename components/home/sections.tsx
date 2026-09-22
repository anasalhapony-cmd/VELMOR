import Link from 'next/link';
import { Truck, BadgeCheck, Wallet, Sparkles } from 'lucide-react';
import { getBlock, getBlocks } from '@/lib/cms/queries';
import { Reveal } from '@/components/ui/Reveal';

/** Editorial brand-story band. */
export async function BrandStory() {
  const b = await getBlock('brand_story');
  return (
    <section className="bg-paper-200 py-section">
      <div className="container-content grid items-center gap-10 md:grid-cols-2">
        <Reveal>
          <span className="eyebrow">{b?.subtitle ?? 'قصة VELMOR'}</span>
          <h2 className="mt-2 font-display-ar text-h1 font-medium leading-tight">
            {b?.title ?? 'أناقة بحضور'}
          </h2>
          <p className="mt-5 max-w-prose text-base leading-loose text-ink-600">
            {b?.body ??
              'وُلدت VELMOR لجيل جديد من الرجال يهتمون بالحضور والثقة والمظهر — توازن بين الفخامة والرجولة وثقافة الشارع.'}
          </p>
          {b?.cta_href && (
            <Link href={b.cta_href} className="btn-outline mt-7">
              {b.cta_label ?? 'المزيد'}
            </Link>
          )}
        </Reveal>
        <Reveal delay={0.1}>
          <div className="aspect-[4/3] rounded-lg bg-ink"
            style={{ background: 'radial-gradient(120% 120% at 20% 10%, #2E3A31, #1B1714)' }} />
        </Reveal>
      </div>
    </section>
  );
}

/** Perfume Finder teaser CTA. */
export function PerfumeFinderTeaser() {
  return (
    <section className="container-content py-section">
      <div className="relative overflow-hidden rounded-lg bg-ink px-6 py-14 text-center text-paper md:px-16">
        <div className="pointer-events-none absolute inset-0 opacity-70"
          style={{ background: 'radial-gradient(90% 120% at 50% 0%, #2E3A31, #1B1714)' }} />
        <div className="relative mx-auto max-w-xl">
          <Sparkles className="mx-auto mb-4 text-gold-300" />
          <h2 className="font-display-ar text-h1 font-medium">مستشار العطور</h2>
          <p className="mt-3 text-paper/75">
            أجب عن بضعة أسئلة ودعنا نرشّح لك العطر الأنسب من مجموعتنا.
          </p>
          <Link href="/finder" className="btn-gold mt-7 inline-flex">
            ابدأ الآن
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Why VELMOR — value props (from CMS blocks, with sensible fallbacks). */
export async function WhyVelmor() {
  const blocks = await getBlocks('why_velmor');
  const items =
    blocks.length > 0
      ? blocks.map((b) => ({ title: b.title ?? '', body: b.body ?? '' }))
      : [
          { title: 'منتج فاخر', body: 'عطور بتركيبات غنية وثبات عالٍ.' },
          { title: 'الدفع عند الاستلام', body: 'ادفع نقدًا عند استلام طلبك.' },
          { title: 'توصيل سريع', body: 'توصيل داخل بنغازي إلى باب منزلك.' },
        ];
  const icons = [BadgeCheck, Wallet, Truck];
  return (
    <section className="container-content py-section">
      <div className="grid gap-6 sm:grid-cols-3">
        {items.slice(0, 3).map((it, i) => {
          const Icon = icons[i] ?? Sparkles;
          return (
            <Reveal key={i} delay={i * 0.08}>
              <div className="flex flex-col items-center rounded-lg border border-ink/10 p-8 text-center">
                <Icon className="mb-4 text-gold-700" />
                <h3 className="font-display-ar text-h3 font-medium">{it.title}</h3>
                <p className="mt-2 text-sm text-ink-500">{it.body}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/** Delivery / COD information band. */
export async function DeliveryInfo() {
  const b = await getBlock('delivery_info');
  return (
    <section className="bg-pine text-paper">
      <div className="container-content flex flex-col items-center gap-3 py-14 text-center">
        <Truck className="text-gold-300" />
        <h2 className="font-display-ar text-h2 font-medium">{b?.title ?? 'توصيل داخل بنغازي'}</h2>
        <p className="max-w-xl text-paper/80">
          {b?.body ?? 'نوصل طلبك إلى جميع مناطق بنغازي مع الدفع عند الاستلام.'}
        </p>
      </div>
    </section>
  );
}

/** Closing brand statement. */
export async function BrandStatement() {
  const b = await getBlock('brand_statement');
  return (
    <section className="container-content py-section text-center">
      <p className="mx-auto max-w-2xl font-display-ar text-h1 font-medium leading-snug text-ink">
        {b?.body ?? 'VELMOR — ليست مجرد عطور، بل أسلوب حياة.'}
      </p>
    </section>
  );
}
