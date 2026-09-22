import { EntityForm, TextField, TextareaField, NumberField, CheckboxField } from '@/components/admin/form';
import type { FormState } from '@/lib/admin/form-state';
import type { FragranceFamilyRow } from '@/types/database';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function FamilyForm({ action, defaults }: { action: Action; defaults?: FragranceFamilyRow }) {
  return (
    <EntityForm action={action} submitLabel={defaults ? 'حفظ التغييرات' : 'إضافة العائلة'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <div className="admin-card space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="name" label="الاسم" required defaultValue={defaults?.name} placeholder="خشبية" />
          <TextField name="slug" label="الرابط (slug)" required defaultValue={defaults?.slug} placeholder="woody" />
          <TextField name="name_en" label="الاسم بالإنجليزية" defaultValue={defaults?.name_en} placeholder="Woody" />
          <NumberField name="sort_order" label="ترتيب العرض" defaultValue={defaults?.sort_order ?? 0} min={0} />
        </div>
        <TextareaField name="description" label="الوصف" defaultValue={defaults?.description} rows={3} />
        <TextField name="image_url" label="رابط الصورة" defaultValue={defaults?.image_url} placeholder="https://…" />
        <CheckboxField name="active" label="مُفعّل" defaultChecked={defaults ? defaults.active : true} />
      </div>
    </EntityForm>
  );
}
