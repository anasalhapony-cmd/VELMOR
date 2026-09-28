import { requirePermission } from '@/lib/admin/auth';
import { PageHeader } from '@/components/admin/ui';
import { BrandForm } from '@/components/admin/forms/BrandForm';
import { createBrand } from '../actions';

export default async function NewBrandPage() {
  await requirePermission('manage_products');
  return (
    <div>
      <PageHeader title="علامة جديدة" backHref="/admin/brands" />
      <BrandForm action={createBrand} />
    </div>
  );
}
