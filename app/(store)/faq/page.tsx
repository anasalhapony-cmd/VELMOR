import type { Metadata } from 'next';
import { getFaqs } from '@/lib/cms/queries';
import { SITE_URL } from '@/config/site';

export const metadata: Metadata = {
  title: 'الأسئلة الشائعة',
  description: 'إجابات عن الطلب والتوصيل والدفع عند الاستلام في VELMOR.',
  alternates: { canonical: '/faq' },
};

export default async function FaqPage() {
  const faqs = await getFaqs();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: `${SITE_URL}/faq`,
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  };
  return (
    <div className="vp-page vp-page--paper">
      {faqs.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      )}
      <header className="vp-page__head vp-wrap">
        <p className="vp-eyebrow">المساعدة</p>
        <h1 className="vp-page__title">الأسئلة الشائعة</h1>
      </header>
      <div className="vp-wrap vp-faq">
        {faqs.length === 0 ? (
          <p className="vp-previews__none">لا توجد أسئلة منشورة بعد.</p>
        ) : (
          faqs.map((f, i) => (
            <details key={f.id} className="vp-faq__item" data-reveal="up" style={{ ['--i' as string]: i }}>
              <summary>
                <span>{f.question}</span>
                <i aria-hidden="true" />
              </summary>
              <p>{f.answer}</p>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
