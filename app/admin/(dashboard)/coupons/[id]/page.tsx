import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { CouponForm } from '@/components/admin/forms/CouponForm';
import { updateCoupon } from '../actions';

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('manage_coupons');
  const { id } = await params;
  const supabase = await createClient();
  const { data: coupon } = await supabase.from('coupons').select('*').eq('id', id).maybeSingle();
  if (!coupon) notFound();

  const [{ data: products }, { data: cats }, { data: brands }, { data: sp }, { data: sc }, { data: sb }] =
    await Promise.all([
      supabase.from('products').select('id, name, name_ar').eq('archived', false).order('name').limit(300),
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('brands').select('id, name').order('name'),
      supabase.from('coupon_products').select('product_id').eq('coupon_id', id),
      supabase.from('coupon_categories').select('category_id').eq('coupon_id', id),
      supabase.from('coupon_brands').select('brand_id').eq('coupon_id', id),
    ]);

  return (
    <div>
      <PageHeader title={`تعديل: ${coupon.code}`} backHref="/admin/coupons" />
      <CouponForm
        action={updateCoupon}
        defaults={coupon}
        products={(products ?? []).map((p) => ({ value: p.id, label: p.name_ar || p.name }))}
        categories={(cats ?? []).map((c) => ({ value: c.id, label: c.name }))}
        brands={(brands ?? []).map((b) => ({ value: b.id, label: b.name }))}
        selected={{
          products: (sp ?? []).map((r) => r.product_id),
          categories: (sc ?? []).map((r) => r.category_id),
          brands: (sb ?? []).map((r) => r.brand_id),
        }}
      />
    </div>
  );
}
