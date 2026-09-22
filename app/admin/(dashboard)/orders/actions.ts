'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { fail, ok, str, optStr, bool, type FormState } from '@/lib/admin/form';
import { ORDER_STATUSES, type OrderStatus } from '@/config/constants';

const PERM = 'manage_orders' as const;

function mapError(msg: string | undefined): string {
  const m = msg ?? '';
  if (m.includes('INVALID_TRANSITION')) return 'انتقال غير مسموح بين الحالتين.';
  if (m.includes('NOT_AUTHORIZED')) return 'ليست لديك صلاحية تنفيذ هذا الإجراء.';
  if (m.includes('ORDER_NOT_FOUND')) return 'الطلب غير موجود.';
  return 'تعذّر تحديث الطلب.';
}

export async function changeStatus(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await permittedActor(PERM);
  if (!me) return fail('ليست لديك صلاحية إدارة الطلبات.');
  const id = str(fd, 'id');
  const to = str(fd, 'to');
  const note = optStr(fd, 'note') ?? null;
  const override = bool(fd, 'override') && me.role === 'owner';
  if (!id || !ORDER_STATUSES.includes(to as OrderStatus)) return fail('حالة غير صالحة.');

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_update_order_status', {
    p_order_id: id,
    p_to: to as OrderStatus,
    p_note: note,
    p_override: override,
  });
  if (error) return fail(mapError(error.message));

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
  return ok('تم تحديث حالة الطلب.');
}

export async function saveInternalNote(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const note = optStr(fd, 'internal_note') ?? null;
  const supabase = await createClient();
  await supabase.from('orders').update({ internal_note: note }).eq('id', id);
  await logAction({ action: 'internal_note', entity: 'orders', entityId: id });
  revalidatePath(`/admin/orders/${id}`);
}
