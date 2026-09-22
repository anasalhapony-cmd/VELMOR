import { requirePermission } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, EmptyState } from '@/components/admin/ui';
import { EntityForm } from '@/components/admin/form';
import { saveSettings } from './actions';
import type { SiteSettingRow } from '@/types/database';

const GROUP_LABELS: Record<string, string> = {
  general: 'إعدادات عامة',
  contact: 'معلومات التواصل',
  social: 'روابط التواصل الاجتماعي',
  homepage: 'الصفحة الرئيسية',
  delivery: 'التوصيل',
  features: 'الميزات (تفعيل/تعطيل)',
  seo: 'تحسين محركات البحث',
  finder: 'أوزان مستشار العطور',
};

function typeOf(value: unknown): 'boolean' | 'number' | 'string' | 'json' {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  return 'json';
}

function Field({ s }: { s: SiteSettingRow }) {
  const t = typeOf(s.value);
  const label = s.label || s.key;
  const name = `value__${s.key}`;
  const longText =
    t === 'string' && /description|announcement|about|statement|body/.test(s.key);
  return (
    <div>
      <input type="hidden" name={`type__${s.key}`} value={t} />
      {t === 'boolean' ? (
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name={name} defaultChecked={s.value === true}
            className="h-4 w-4 rounded border-ink/30 text-gold focus:ring-gold/40" />
          {label}
        </label>
      ) : (
        <>
          <label className="admin-label">{label}</label>
          {t === 'number' ? (
            <input type="number" step="any" name={name} defaultValue={Number(s.value)} className="admin-input" />
          ) : t === 'json' ? (
            <textarea name={name} rows={3} defaultValue={JSON.stringify(s.value, null, 2)} className="admin-input font-mono text-xs" dir="ltr" />
          ) : longText ? (
            <textarea name={name} rows={3} defaultValue={String(s.value ?? '')} className="admin-input" />
          ) : (
            <input type="text" name={name} defaultValue={String(s.value ?? '')} className="admin-input" />
          )}
          <p className="admin-hint font-mono">{s.key}</p>
        </>
      )}
    </div>
  );
}

export default async function SettingsPage() {
  await requirePermission('manage_settings');
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .order('group_name', { ascending: true });

  if (!settings || settings.length === 0) {
    return (
      <div>
        <PageHeader title="الإعدادات" />
        <EmptyState title="لا توجد إعدادات" description="سيتم إنشاؤها من بيانات البذور (seed)." />
      </div>
    );
  }

  const groups = new Map<string, SiteSettingRow[]>();
  for (const s of settings) {
    const g = s.group_name || 'general';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(s);
  }
  const allKeys = settings.map((s) => s.key).join(',');

  return (
    <div>
      <PageHeader title="الإعدادات" description="قيم المتجر التشغيلية — تُقرأ في وقت التشغيل ولا تتطلب تعديل الشيفرة." />
      <EntityForm action={saveSettings} submitLabel="حفظ كل الإعدادات">
        <input type="hidden" name="keys" value={allKeys} />
        {[...groups.entries()].map(([group, rows]) => (
          <section key={group} className="admin-card space-y-4">
            <h2 className="font-medium text-ink">{GROUP_LABELS[group] ?? group}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {rows.map((s) => <Field key={s.key} s={s} />)}
            </div>
          </section>
        ))}
      </EntityForm>
    </div>
  );
}
