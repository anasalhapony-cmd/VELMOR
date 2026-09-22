import { EntityForm, TextField, TextareaField, CheckboxField } from '@/components/admin/form';
import type { FormState } from '@/lib/admin/form-state';
import type { PageRow } from '@/types/database';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function PageForm({ action, defaults }: { action: Action; defaults?: PageRow }) {
  return (
    <EntityForm action={action} submitLabel={defaults ? 'حفظ الصفحة' : 'إنشاء الصفحة'}>
      <div className="admin-card space-y-5">
        <div className="rounded border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          ملاحظة (§112): لا تُنشر الصفحة للعملاء إلا عند تفعيل «معتمدة». حتى ذلك الحين تُعامل كمحتوى مؤقّت ولا تُفهرس.
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="slug" label="الرابط (slug)" required defaultValue={defaults?.slug}
            placeholder="privacy" hint="مثل: privacy, terms, about, delivery, returns" />
          <TextField name="title" label="العنوان" required defaultValue={defaults?.title} />
        </div>
        <TextareaField name="body" label="المحتوى" defaultValue={defaults?.body} rows={12} />
        <div className="grid gap-3 sm:grid-cols-2">
          <CheckboxField name="approved" label="معتمدة (تُنشر للعملاء)" defaultChecked={defaults?.approved ?? false} />
          <CheckboxField name="active" label="مُفعّلة" defaultChecked={defaults ? defaults.active : true} />
          <CheckboxField name="noindex" label="منع الفهرسة (noindex)" defaultChecked={defaults ? defaults.noindex : true} />
          <CheckboxField name="is_placeholder" label="محتوى مؤقّت (placeholder)" defaultChecked={defaults ? defaults.is_placeholder : true} />
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
