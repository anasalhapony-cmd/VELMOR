import { EntityForm, TextField, TextareaField, NumberField, CheckboxField } from '@/components/admin/form';
import type { FormState } from '@/lib/admin/form-state';
import type { PromotionRow } from '@/types/database';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

const localDT = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 16) : undefined);

export function PromotionForm({ action, defaults }: { action: Action; defaults?: PromotionRow }) {
  const configText = defaults?.config ? JSON.stringify(defaults.config, null, 2) : '';
  return (
    <EntityForm action={action} submitLabel={defaults ? 'حفظ التغييرات' : 'إنشاء العرض'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <div className="admin-card space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="title" label="العنوان" required defaultValue={defaults?.title} />
          <TextField name="kind" label="النوع" defaultValue={defaults?.kind ?? 'SALE'} hint="مثل: SALE, BUNDLE, SEASONAL" />
          <TextField name="starts_at" label="يبدأ في" type="datetime-local" defaultValue={localDT(defaults?.starts_at)} />
          <TextField name="ends_at" label="ينتهي في" type="datetime-local" defaultValue={localDT(defaults?.ends_at)} />
          <NumberField name="sort_order" label="ترتيب العرض" defaultValue={defaults?.sort_order ?? 0} min={0} />
        </div>
        <TextareaField name="config" label="إعدادات (JSON اختياري)" defaultValue={configText} rows={4} hint='مثال: {"discount_percent": 20}' />
        <CheckboxField name="active" label="مُفعّل" defaultChecked={defaults ? defaults.active : true} />
      </div>
    </EntityForm>
  );
}
