import Link from 'next/link';
import { Newspaper, HelpCircle, FileText, LayoutDashboard } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState } from '@/components/admin/ui';
import { updateSection } from './actions';

const SECTION_LABELS: Record<string, string> = {
  announcement: 'الشريط الإعلاني',
  hero: 'الواجهة (Hero)',
  featured_collection: 'المجموعة المميزة',
  best_sellers: 'الأكثر مبيعًا',
  brand_story: 'قصة العلامة',
  perfume_finder: 'مستشار العطور',
  fragrance_families: 'العائلات العطرية',
  featured_products: 'منتجات مميزة',
  new_arrivals: 'وصل حديثًا',
  seasonal: 'مجموعة موسمية',
  reviews: 'آراء العملاء',
  why_velmor: 'لماذا VELMOR',
  delivery_info: 'معلومات التوصيل',
  whatsapp_cta: 'زر واتساب',
  brand_statement: 'العبارة الختامية',
};

export default async function CmsPage() {
  await requirePermission('manage_cms');
  const supabase = await createClient();
  const { data: sections } = await supabase
    .from('homepage_sections')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div>
      <PageHeader title="إدارة المحتوى" description="تحكّم في أقسام الصفحة الرئيسية والصفحات والأسئلة الشائعة." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/cms/pages" className="admin-card flex items-center gap-3 hover:border-gold/40">
          <FileText className="text-gold-700" /> <span className="font-medium">الصفحات (سياسات، من نحن…)</span>
        </Link>
        <Link href="/admin/cms/faq" className="admin-card flex items-center gap-3 hover:border-gold/40">
          <HelpCircle className="text-gold-700" /> <span className="font-medium">الأسئلة الشائعة</span>
        </Link>
        <Link href="/admin/cms/blocks" className="admin-card flex items-center gap-3 hover:border-gold/40">
          <Newspaper className="text-gold-700" /> <span className="font-medium">كتل المحتوى</span>
        </Link>
      </div>

      <h2 className="mb-3 flex items-center gap-2 font-medium text-ink"><LayoutDashboard size={18} /> أقسام الصفحة الرئيسية</h2>
      {!sections || sections.length === 0 ? (
        <EmptyState title="لم تُهيّأ الأقسام بعد" description="سيتم إنشاؤها من بيانات البذور (seed)." />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>القسم</th><th>العنوان</th><th>الترتيب</th><th>مُفعّل</th><th></th></tr></thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-xs text-ink-500">{SECTION_LABELS[s.key] ?? s.key}</td>
                  <td colSpan={4}>
                    <form action={updateSection} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={s.id} />
                      <input name="title" defaultValue={s.title} placeholder="عنوان القسم" className="admin-input w-48" />
                      <input name="sort_order" type="number" defaultValue={s.sort_order} className="admin-input w-24" />
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="active" defaultChecked={s.active} className="h-4 w-4 rounded border-ink/30 text-gold focus:ring-gold/40" />
                        مُفعّل
                      </label>
                      <button type="submit" className="admin-btn-sm">حفظ</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
