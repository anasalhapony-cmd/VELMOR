'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { fail, ok, str, bool, type FormState } from '@/lib/admin/form';

/**
 * Save the store settings form. Each setting is submitted as value__<key> with a
 * companion type__<key> so we can coerce the string form value back to its typed
 * JSON representation before writing site_settings.value (jsonb).
 */
export async function saveSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor('manage_settings');
  if (!me) return fail('ليست لديك صلاحية إدارة الإعدادات.');

  const keys = str(fd, 'keys').split(',').map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) return ok('لا تغييرات.');

  const supabase = await createClient();
  for (const key of keys) {
    const type = str(fd, `type__${key}`);
    let value: unknown;
    if (type === 'boolean') {
      value = bool(fd, `value__${key}`);
    } else if (type === 'number') {
      const n = Number(str(fd, `value__${key}`));
      value = Number.isFinite(n) ? n : 0;
    } else if (type === 'json') {
      try {
        value = JSON.parse(str(fd, `value__${key}`) || 'null');
      } catch {
        return fail(`قيمة غير صالحة (JSON) للإعداد: ${key}`);
      }
    } else {
      value = str(fd, `value__${key}`);
    }
    await supabase.from('site_settings').update({ value: value as never }).eq('key', key);
  }

  await logAction({ action: 'update', entity: 'site_settings', next: { keys } });
  revalidatePath('/admin/settings');
  revalidatePath('/', 'layout');
  return ok('تم حفظ الإعدادات.');
}
