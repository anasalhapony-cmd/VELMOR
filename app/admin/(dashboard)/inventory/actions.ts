'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { inventoryAdjustSchema } from '@/lib/admin/validation';
import { fail, ok, zodFieldErrors, str, optStr, num, type FormState } from '@/lib/admin/form';
import type { InventoryReason } from '@/config/constants';

function mapError(msg: string | undefined): string {
  const m = msg ?? '';
  if (m.includes('INSUFFICIENT_STOCK')) return 'الكمية غير كافية — سيصبح المخزون سالبًا.';
  if (m.includes('RESERVED_REASON')) return 'هذا السبب محجوز لنظام الطلبات.';
  if (m.includes('NOT_AUTHORIZED')) return 'ليست لديك صلاحية إدارة المخزون.';
  if (m.includes('VARIANT_NOT_FOUND')) return 'المقاس غير موجود.';
  return 'تعذّر تعديل المخزون.';
}

export async function adjustStock(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor('manage_inventory');
  if (!me) return fail('ليست لديك صلاحية إدارة المخزون.');

  const parsed = inventoryAdjustSchema.safeParse({
    variant_id: str(fd, 'variant_id'),
    change: num(fd, 'change'),
    reason: str(fd, 'reason'),
    note: optStr(fd, 'note'),
  });
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_adjust_inventory', {
    p_variant_id: parsed.data.variant_id,
    p_change: parsed.data.change,
    p_reason: parsed.data.reason as InventoryReason,
    p_note: parsed.data.note ?? null,
  });
  if (error) return fail(mapError(error.message));

  revalidatePath('/admin/inventory');
  revalidatePath(`/admin/inventory/${parsed.data.variant_id}`);
  return ok('تم تحديث المخزون.');
}
