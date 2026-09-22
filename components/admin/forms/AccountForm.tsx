import { EntityForm, TextField, SelectField, CheckboxField, CheckboxGroup } from '@/components/admin/form';
import type { FormState } from '@/lib/admin/form-state';
import type { AdminUserRow } from '@/types/database';
import { ADMIN_PERMISSIONS, ADMIN_ROLES } from '@/config/constants';
import { PERMISSION_LABELS_AR, ROLE_LABELS_AR } from '@/lib/admin/permissions';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function AccountForm({
  action,
  defaults,
  email,
}: {
  action: Action;
  defaults?: AdminUserRow;
  email?: string;
}) {
  const permOptions = ADMIN_PERMISSIONS.map((p) => ({ value: p, label: PERMISSION_LABELS_AR[p] }));
  const roleOptions = ADMIN_ROLES.map((r) => ({ value: r, label: ROLE_LABELS_AR[r] }));
  return (
    <EntityForm action={action} submitLabel={defaults ? 'حفظ الحساب' : 'إنشاء الحساب'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <div className="admin-card space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          {defaults ? (
            <div>
              <label className="admin-label">البريد الإلكتروني</label>
              <input value={email ?? ''} disabled dir="ltr" className="admin-input" />
              <input type="hidden" name="email" value={email ?? ''} />
            </div>
          ) : (
            <TextField name="email" label="البريد الإلكتروني" required type="email" placeholder="staff@velmor.ly" />
          )}
          <TextField name="full_name" label="الاسم الكامل" required defaultValue={defaults?.full_name} />
          <SelectField name="role" label="الدور" required defaultValue={defaults?.role ?? 'staff'} options={roleOptions} />
          <TextField
            name="password"
            label={defaults ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}
            type="password"
            required={!defaults}
            hint="8 أحرف على الأقل"
          />
        </div>
        <CheckboxField name="active" label="حساب مُفعّل" defaultChecked={defaults ? defaults.active : true} />
      </div>
      <div className="admin-card space-y-3">
        <p className="text-sm font-medium text-ink">الصلاحيات</p>
        <p className="text-xs text-ink-500">المالك يملك جميع الصلاحيات تلقائيًا؛ لا حاجة لتحديدها له.</p>
        <CheckboxGroup name="permissions" label="" options={permOptions} defaultValues={defaults?.permissions ?? []} />
      </div>
    </EntityForm>
  );
}
