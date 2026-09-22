import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasPermission, type AdminIdentity } from '@/lib/admin/permissions';
import type { AdminPermission } from '@/config/constants';

/**
 * Resolve the current admin identity from the session, or null. This runs as
 * the signed-in user against RLS, so it can only ever read the caller's own
 * admin_users row (admin_users_read policy). The database is authoritative;
 * this is the app-layer mirror used for gating UI + actions.
 */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('admin_users')
    .select('id, full_name, role, permissions, active')
    .eq('id', user.id)
    .maybeSingle();

  if (!data || !data.active) return null;
  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role,
    permissions: data.permissions ?? [],
    active: data.active,
  };
}

/** Require an active admin; otherwise send to login. Use in layouts/pages. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const me = await getAdminIdentity();
  if (!me) redirect('/admin/login');
  return me;
}

/** Require a specific permission for a page; deny → back to the dashboard. */
export async function requirePermission(perm: AdminPermission): Promise<AdminIdentity> {
  const me = await requireAdmin();
  if (!hasPermission(me, perm)) redirect(`/admin?denied=${perm}`);
  return me;
}

/** Require the owner role (admin-account management). */
export async function requireOwner(): Promise<AdminIdentity> {
  const me = await requireAdmin();
  if (me.role !== 'owner') redirect('/admin?denied=owner');
  return me;
}

/**
 * For use inside Server Actions: returns the identity if the permission is held,
 * otherwise null (so the action can return a form error instead of redirecting).
 */
export async function permittedActor(perm: AdminPermission): Promise<AdminIdentity | null> {
  const me = await getAdminIdentity();
  if (!me || !hasPermission(me, perm)) return null;
  return me;
}
