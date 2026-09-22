import { requirePermission } from '@/lib/admin/auth';
import { PageHeader } from '@/components/admin/ui';
import { PromotionForm } from '@/components/admin/forms/PromotionForm';
import { createPromotion } from '../actions';

export default async function NewPromotionPage() {
  await requirePermission('manage_coupons');
  return (
    <div>
      <PageHeader title="عرض جديد" backHref="/admin/promotions" />
      <PromotionForm action={createPromotion} />
    </div>
  );
}
