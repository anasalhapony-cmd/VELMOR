import type { Metadata } from 'next';
import { getFacets } from '@/lib/products/queries';
import { FinderWizard } from '@/components/finder/FinderWizard';

export const metadata: Metadata = {
  title: 'مستشار العطور',
  description: 'أجب عن بضعة أسئلة ودعنا نرشّح لك العطر الأنسب من مجموعة VELMOR.',
};

export default async function FinderPage() {
  const { families } = await getFacets();
  return (
    <div className="container-content py-12">
      <div className="mb-10 text-center">
        <h1 className="font-display-ar text-h1 font-medium">مستشار العطور</h1>
        <p className="mt-2 text-ink-500">دعنا نساعدك في اختيار العطر الأنسب لك.</p>
      </div>
      <FinderWizard families={families} />
    </div>
  );
}
