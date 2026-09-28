import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { CouponForm } from '@/components/admin/forms/CouponForm';
import { createCoupon } from '../actions';

export default async function NewCouponPage() {
  await requirePermission('manage_coupons');
  const supabase = await createClient();
  const [{ data: products }, { data: cats }, { data: brands }] = await Promise.all([
    supabase.from('products').select('id, name, name_ar').eq('archived', false).order('name').limit(300),
    supabase.from('categories').select('id, name').order('name'),
    supabase.from('brands').select('id, name').order('name'),
  ]);
  return (
    <div>
      <PageHeader title="كوبون جديد" backHref="/admin/coupons" />
      <CouponForm
        action={createCoupon}
        products={(products ?? []).map((p) => ({ value: p.id, label: p.name_ar || p.name }))}
        categories={(cats ?? []).map((c) => ({ value: c.id, label: c.name }))}
        brands={(brands ?? []).map((b) => ({ value: b.id, label: b.name }))}
      />
    </div>
  );
}
