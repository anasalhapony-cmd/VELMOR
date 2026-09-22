import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/ui';
import { BrandForm } from '@/components/admin/forms/BrandForm';
import { updateBrand } from '../actions';

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('manage_products');
  const { id } = await params;
  const supabase = await createClient();
  const { data: brand } = await supabase.from('brands').select('*').eq('id', id).maybeSingle();
  if (!brand) notFound();

  return (
    <div>
      <PageHeader title={`تعديل: ${brand.name}`} backHref="/admin/brands" />
      <BrandForm action={updateBrand} defaults={brand} />
    </div>
  );
}
