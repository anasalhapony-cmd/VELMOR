import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState, ActiveBadge } from '@/components/admin/ui';
import { DangerButton } from '@/components/admin/DangerButton';
import { setBrandActive, deleteBrand } from './actions';

export default async function BrandsPage() {
  await requirePermission('manage_products');
  const supabase = await createClient();
  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  return (
    <div>
      <PageHeader
        title="العلامات التجارية"
        description="أضف وعدّل العلامات التجارية للعطور."
        action={
          <Link href="/admin/brands/new" className="btn-primary">
            <Plus size={16} /> علامة جديدة
          </Link>
        }
      />
      {!brands || brands.length === 0 ? (
        <EmptyState
          title="لا توجد علامات بعد"
          description="ابدأ بإضافة أول علامة تجارية."
          action={<Link href="/admin/brands/new" className="btn-primary"><Plus size={16} /> علامة جديدة</Link>}
        />
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الرابط</th>
                <th>الترتيب</th>
                <th>الحالة</th>
                <th className="text-end">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">{b.name}</td>
                  <td className="font-mono text-xs text-ink-500">{b.slug}</td>
                  <td className="tabular-nums">{b.sort_order}</td>
                  <td><ActiveBadge active={b.active} /></td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/brands/${b.id}`} className="admin-btn-sm">
                        <Pencil size={14} /> تعديل
                      </Link>
                      <form action={setBrandActive}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="active" value={b.active ? '' : 'on'} />
                        <button type="submit" className="admin-btn-sm">
                          {b.active ? 'تعطيل' : 'تفعيل'}
                        </button>
                      </form>
                      <form action={deleteBrand}>
                        <input type="hidden" name="id" value={b.id} />
                        <DangerButton />
                      </form>
                    </div>
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
