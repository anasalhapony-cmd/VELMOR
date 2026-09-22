import { EntityForm, TextField, TextareaField, NumberField, CheckboxField } from '@/components/admin/form';
import type { FormState } from '@/lib/admin/form-state';
import type { BrandRow } from '@/types/database';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function BrandForm({ action, defaults }: { action: Action; defaults?: BrandRow }) {
  return (
    <EntityForm action={action} submitLabel={defaults ? 'حفظ التغييرات' : 'إضافة العلامة'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <div className="admin-card space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="name" label="الاسم" required defaultValue={defaults?.name} />
          <TextField name="slug" label="الرابط (slug)" required defaultValue={defaults?.slug}
            hint="يظهر في الرابط: /brands/الرابط" placeholder="velmor" />
          <TextField name="name_en" label="الاسم بالإنجليزية" defaultValue={defaults?.name_en} />
          <NumberField name="sort_order" label="ترتيب العرض" defaultValue={defaults?.sort_order ?? 0} min={0} />
        </div>
        <TextareaField name="description" label="الوصف" defaultValue={defaults?.description} rows={3} />
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="logo_url" label="رابط الشعار" defaultValue={defaults?.logo_url} placeholder="https://…" />
          <TextField name="image_url" label="رابط الصورة" defaultValue={defaults?.image_url} placeholder="https://…" />
        </div>
      </div>
      <div className="admin-card space-y-5">
        <p className="text-sm font-medium text-ink">تحسين محركات البحث (SEO)</p>
        <TextField name="seo_title" label="عنوان SEO" defaultValue={defaults?.seo_title} />
        <TextareaField name="seo_description" label="وصف SEO" defaultValue={defaults?.seo_description} rows={2} />
      </div>
      <div className="admin-card">
        <CheckboxField name="active" label="مُفعّل (يظهر في المتجر)" defaultChecked={defaults ? defaults.active : true} />
      </div>
    </EntityForm>
  );
}
