import { EntityForm, TextField, NumberField, CheckboxField } from '@/components/admin/form';
import type { FormState } from '@/lib/admin/form-state';
import type { FragranceNoteRow } from '@/types/database';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function NoteForm({ action, defaults }: { action: Action; defaults?: FragranceNoteRow }) {
  return (
    <EntityForm action={action} submitLabel={defaults ? 'حفظ التغييرات' : 'إضافة النوتة'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <div className="admin-card space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="name" label="الاسم" required defaultValue={defaults?.name} placeholder="برغموت" />
          <TextField name="slug" label="الرابط (slug)" required defaultValue={defaults?.slug} placeholder="bergamot" />
          <TextField name="name_en" label="الاسم بالإنجليزية" defaultValue={defaults?.name_en} placeholder="Bergamot" />
          <NumberField name="sort_order" label="ترتيب العرض" defaultValue={defaults?.sort_order ?? 0} min={0} />
        </div>
        <TextField name="icon_url" label="رابط الأيقونة/الصورة" defaultValue={defaults?.icon_url} placeholder="https://…" />
        <CheckboxField name="active" label="مُفعّل" defaultChecked={defaults ? defaults.active : true} />
      </div>
    </EntityForm>
  );
}
