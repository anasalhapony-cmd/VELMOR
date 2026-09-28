import {
  EntityForm, TextField, NumberField, SelectField, CheckboxField, MultiSelectField, type Option,
} from '@/components/admin/form';
import type { FormState } from '@/lib/admin/form-state';
import type { CouponRow } from '@/types/database';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

const localDT = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 16) : undefined);

export function CouponForm({
  action,
  defaults,
  products,
  categories,
  brands,
  selected = { products: [], categories: [], brands: [] },
}: {
  action: Action;
  defaults?: CouponRow;
  products: Option[];
  categories: Option[];
  brands: Option[];
  selected?: { products: string[]; categories: string[]; brands: string[] };
}) {
  return (
    <EntityForm action={action} submitLabel={defaults ? 'حفظ التغييرات' : 'إنشاء الكوبون'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <section className="admin-card space-y-5">
        <h2 className="font-medium text-ink">تفاصيل الكوبون</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="code" label="الكود" required defaultValue={defaults?.code} placeholder="WELCOME10" />
          <SelectField name="type" label="نوع الخصم" required defaultValue={defaults?.type ?? 'PERCENTAGE'}
            options={[{ value: 'PERCENTAGE', label: 'نسبة مئوية (%)' }, { value: 'FIXED', label: 'مبلغ ثابت (د.ل)' }]} />
          <NumberField name="value" label="القيمة" required defaultValue={defaults ? Number(defaults.value) : undefined} step="0.001" min={0} hint="للنسبة: 1–100. للثابت: بالدينار." />
          <NumberField name="min_order_amount" label="الحد الأدنى للطلب (د.ل)" defaultValue={defaults ? Number(defaults.min_order_amount) : 0} step="0.001" min={0} />
          <NumberField name="max_discount" label="أقصى خصم (اختياري)" defaultValue={defaults?.max_discount ? Number(defaults.max_discount) : undefined} step="0.001" min={0} />
          <NumberField name="usage_limit" label="حد الاستخدام الكلي (اختياري)" defaultValue={defaults?.usage_limit ?? undefined} min={0} />
          <NumberField name="per_customer_limit" label="حد لكل عميل (اختياري)" defaultValue={defaults?.per_customer_limit ?? undefined} min={0} />
          <TextField name="starts_at" label="يبدأ في" type="datetime-local" defaultValue={localDT(defaults?.starts_at)} />
          <TextField name="ends_at" label="ينتهي في" type="datetime-local" defaultValue={localDT(defaults?.ends_at)} />
        </div>
        <CheckboxField name="active" label="مُفعّل" defaultChecked={defaults ? defaults.active : true} />
      </section>

      <section className="admin-card space-y-5">
        <h2 className="font-medium text-ink">نطاق التطبيق (اختياري)</h2>
        <p className="text-sm text-ink-500">اترك الكل فارغًا لتطبيق الكوبون على كامل المتجر.</p>
        {products.length > 0 && <MultiSelectField name="product_ids" label="منتجات محددة" options={products} defaultValues={selected.products} />}
        {categories.length > 0 && <MultiSelectField name="category_ids" label="تصنيفات محددة" options={categories} defaultValues={selected.categories} />}
        {brands.length > 0 && <MultiSelectField name="brand_ids" label="علامات محددة" options={brands} defaultValues={selected.brands} />}
      </section>
    </EntityForm>
  );
}
