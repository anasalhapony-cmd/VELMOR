import type { Metadata } from 'next';
import { getFaqs } from '@/lib/cms/queries';

export const metadata: Metadata = {
  title: 'الأسئلة الشائعة',
  description: 'إجابات لأكثر الأسئلة شيوعًا حول الطلب والتوصيل والدفع في VELMOR.',
};

export default async function FaqPage() {
  const faqs = await getFaqs();
  return (
    <div className="container-content max-w-3xl py-14">
      <h1 className="mb-8 font-display-ar text-h1 font-medium">الأسئلة الشائعة</h1>
      {faqs.length === 0 ? (
        <p className="text-ink-500">لا توجد أسئلة بعد.</p>
      ) : (
        <div className="flex flex-col divide-y divide-ink/10">
          {faqs.map((f) => (
            <details key={f.id} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-display-ar text-lg font-medium">
                {f.question}
                <span className="text-ink-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-600">{f.answer}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
