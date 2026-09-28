import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { PromotionForm } from '@/components/admin/forms/PromotionForm';
import { updatePromotion } from '../actions';

export default async function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('manage_coupons');
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase.from('promotions').select('*').eq('id', id).maybeSingle();
  if (!row) notFound();
  return (
    <div>
      <PageHeader title={`تعديل: ${row.title}`} backHref="/admin/promotions" />
      <PromotionForm action={updatePromotion} defaults={row} />
    </div>
  );
}
