import { EntityForm, TextField, TextareaField, NumberField, CheckboxField } from '@/components/admin/form';
import type { FormState } from '@/lib/admin/form-state';
import type { CollectionRow } from '@/types/database';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function CollectionForm({ action, defaults }: { action: Action; defaults?: CollectionRow }) {
  return (
    <EntityForm action={action} submitLabel={defaults ? 'حفظ التغييرات' : 'إضافة المجموعة'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <div className="admin-card space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="name" label="الاسم" required defaultValue={defaults?.name} />
          <TextField name="slug" label="الرابط (slug)" required defaultValue={defaults?.slug} placeholder="signature" />
          <TextField name="name_en" label="الاسم بالإنجليزية" defaultValue={defaults?.name_en} />
          <NumberField name="sort_order" label="ترتيب العرض" defaultValue={defaults?.sort_order ?? 0} min={0} />
        </div>
        <TextareaField name="description" label="الوصف" defaultValue={defaults?.description} rows={3} />
        <TextField name="image_url" label="رابط الصورة" defaultValue={defaults?.image_url} placeholder="https://…" />
        <div className="flex flex-col gap-3">
          <CheckboxField name="is_seasonal" label="مجموعة موسمية" defaultChecked={defaults?.is_seasonal ?? false} />
          <CheckboxField name="active" label="مُفعّلة" defaultChecked={defaults ? defaults.active : true} />
        </div>
      </div>
      <div className="admin-card space-y-5">
        <p className="text-sm font-medium text-ink">SEO</p>
        <TextField name="seo_title" label="عنوان SEO" defaultValue={defaults?.seo_title} />
        <TextareaField name="seo_description" label="وصف SEO" defaultValue={defaults?.seo_description} rows={2} />
      </div>
    </EntityForm>
  );
}
