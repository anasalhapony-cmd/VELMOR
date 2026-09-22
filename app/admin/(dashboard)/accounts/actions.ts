'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminIdentity } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { adminAccountSchema } from '@/lib/admin/validation';
import { fail, zodFieldErrors, str, optStr, bool, strList, type FormState } from '@/lib/admin/form';
import type { AdminRole } from '@/config/constants';

const PATH = '/admin/accounts';

async function requireOwnerActor() {
  const me = await getAdminIdentity();
  if (!me || me.role !== 'owner') return null;
  return me;
}

function parse(fd: FormData) {
  return adminAccountSchema.safeParse({
    email: str(fd, 'email'),
    full_name: str(fd, 'full_name'),
    role: str(fd, 'role'),
    permissions: strList(fd, 'permissions'),
    active: bool(fd, 'active'),
    password: optStr(fd, 'password'),
  });
}

export async function createAdminAccount(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireOwnerActor();
  if (!me) return fail('هذه العملية مخصّصة للمالك فقط.');
  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));
  if (!parsed.data.password) return fail('كلمة المرور مطلوبة لإنشاء حساب.', { password: 'مطلوبة' });

  const admin = createAdminClient();
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (authErr || !created?.user) return fail('تعذّر إنشاء الحساب. قد يكون البريد مستخدمًا.');

  const { error } = await admin.from('admin_users').insert({
    id: created.user.id,
    full_name: parsed.data.full_name,
    role: parsed.data.role as AdminRole,
    permissions: parsed.data.role === 'owner' ? [] : parsed.data.permissions,
    active: parsed.data.active,
  });
  if (error) return fail('أُنشئ المستخدم لكن تعذّر ربط صلاحياته. راجع قاعدة البيانات.');

  await logAction({
    action: 'create',
    entity: 'admin_users',
    entityId: created.user.id,
    next: { email: parsed.data.email, role: parsed.data.role },
  });
  revalidatePath(PATH);
  redirect(PATH);
}

export async function updateAdminAccount(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireOwnerActor();
  if (!me) return fail('هذه العملية مخصّصة للمالك فقط.');
  const id = str(fd, 'id');
  if (!id) return fail('معرّف غير صالح.');
  const parsed = parse(fd);
  if (!parsed.success) return fail('يرجى مراجعة الحقول.', zodFieldErrors(parsed.error));

  // Guard against self-lockout.
  if (id === me.id && (!parsed.data.active || parsed.data.role !== 'owner')) {
    return fail('لا يمكنك تعطيل حسابك أو إزالة دور المالك عن نفسك.');
  }

  const supabase = await createClient();
  const { data: prev } = await supabase.from('admin_users').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase
    .from('admin_users')
    .update({
      full_name: parsed.data.full_name,
      role: parsed.data.role as AdminRole,
      permissions: parsed.data.role === 'owner' ? [] : parsed.data.permissions,
      active: parsed.data.active,
    })
    .eq('id', id);
  if (error) return fail('تعذّر حفظ الحساب.');

  // Optional password reset via the service role.
  if (parsed.data.password) {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(id, { password: parsed.data.password });
  }

  await logAction({ action: 'update', entity: 'admin_users', entityId: id, previous: prev, next: { role: parsed.data.role, active: parsed.data.active } });
  revalidatePath(PATH);
  redirect(PATH);
}

export async function setAccountActive(fd: FormData): Promise<void> {
  const me = await requireOwnerActor();
  if (!me) return;
  const id = str(fd, 'id');
  const active = bool(fd, 'active');
  if (id === me.id && !active) return; // never deactivate yourself
  const supabase = await createClient();
  await supabase.from('admin_users').update({ active }).eq('id', id);
  await logAction({ action: active ? 'activate' : 'deactivate', entity: 'admin_users', entityId: id });
  revalidatePath(PATH);
}
