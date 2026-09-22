import { EntityForm, TextField, TextareaField, NumberField, CheckboxField } from '@/components/admin/form';
import type { FormState } from '@/lib/admin/form-state';
import type { FaqRow } from '@/types/database';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function FaqForm({ action, defaults }: { action: Action; defaults?: FaqRow }) {
  return (
    <EntityForm action={action} submitLabel={defaults ? 'حفظ' : 'إضافة السؤال'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <div className="admin-card space-y-5">
        <TextField name="question" label="السؤال" required defaultValue={defaults?.question} />
        <TextareaField name="answer" label="الإجابة" required defaultValue={defaults?.answer} rows={4} />
        <div className="grid gap-5 md:grid-cols-2">
          <NumberField name="sort_order" label="ترتيب العرض" defaultValue={defaults?.sort_order ?? 0} min={0} />
          <div className="flex items-end"><CheckboxField name="active" label="مُفعّل" defaultChecked={defaults ? defaults.active : true} /></div>
        </div>
      </div>
    </EntityForm>
  );
}
