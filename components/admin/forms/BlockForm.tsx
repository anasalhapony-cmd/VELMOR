import { EntityForm, TextField, TextareaField, NumberField, CheckboxField } from '@/components/admin/form';
import type { FormState } from '@/lib/admin/form-state';
import type { CmsBlockRow } from '@/types/database';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

const localDT = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 16) : undefined);

export function BlockForm({ action, defaults }: { action: Action; defaults?: CmsBlockRow }) {
  return (
    <EntityForm action={action} submitLabel={defaults ? 'حفظ' : 'إضافة الكتلة'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <div className="admin-card space-y-5">
        <TextField name="section_key" label="مفتاح القسم" required defaultValue={defaults?.section_key}
          hint="مثل: hero, announcement, brand_story, why_velmor" />
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="title" label="العنوان" defaultValue={defaults?.title} />
          <TextField name="subtitle" label="العنوان الفرعي" defaultValue={defaults?.subtitle} />
        </div>
        <TextareaField name="body" label="النص" defaultValue={defaults?.body} rows={3} />
        <TextField name="image_url" label="رابط الصورة" defaultValue={defaults?.image_url} placeholder="https://…" />
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="cta_label" label="نص الزر (CTA)" defaultValue={defaults?.cta_label} />
          <TextField name="cta_href" label="رابط الزر" defaultValue={defaults?.cta_href} />
          <TextField name="starts_at" label="يبدأ العرض في" type="datetime-local" defaultValue={localDT(defaults?.starts_at)} />
          <TextField name="ends_at" label="ينتهي العرض في" type="datetime-local" defaultValue={localDT(defaults?.ends_at)} />
          <NumberField name="sort_order" label="ترتيب العرض" defaultValue={defaults?.sort_order ?? 0} min={0} />
          <div className="flex items-end"><CheckboxField name="active" label="مُفعّلة" defaultChecked={defaults ? defaults.active : true} /></div>
        </div>
      </div>
    </EntityForm>
  );
}
