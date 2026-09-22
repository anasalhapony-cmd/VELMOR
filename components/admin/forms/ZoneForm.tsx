import { EntityForm, TextField, NumberField, CheckboxField } from '@/components/admin/form';
import type { FormState } from '@/lib/admin/form-state';
import type { DeliveryZoneRow } from '@/types/database';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function ZoneForm({ action, defaults }: { action: Action; defaults?: DeliveryZoneRow }) {
  return (
    <EntityForm action={action} submitLabel={defaults ? 'حفظ التغييرات' : 'إضافة المنطقة'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <div className="admin-card space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="name" label="اسم المنطقة" required defaultValue={defaults?.name} placeholder="وسط بنغازي" />
          <TextField name="city" label="المدينة" required defaultValue={defaults?.city} placeholder="بنغازي" />
          <TextField name="area" label="الحي/المنطقة الفرعية" defaultValue={defaults?.area} />
          <NumberField name="fee" label="رسوم التوصيل (د.ل)" required defaultValue={defaults ? Number(defaults.fee) : 0} min={0} step="0.001" />
          <NumberField name="sort_order" label="ترتيب العرض" defaultValue={defaults?.sort_order ?? 0} min={0} />
        </div>
        <CheckboxField name="active" label="مُفعّلة (متاحة عند الدفع)" defaultChecked={defaults ? defaults.active : true} />
      </div>
    </EntityForm>
  );
}
