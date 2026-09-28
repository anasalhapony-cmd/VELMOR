'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { permittedActor } from '@/lib/admin/auth';
import { logAction } from '@/lib/admin/audit';
import { str } from '@/lib/admin/form';

const PATH = '/admin/reviews';
const PERM = 'manage_reviews' as const;

export async function approveReview(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const supabase = await createClient();
  await supabase
    .from('reviews')
    .update({ status: 'APPROVED', approved_at: new Date().toISOString(), approved_by: me.id })
    .eq('id', id);
  await logAction({ action: 'approve', entity: 'reviews', entityId: id });
  revalidatePath(PATH);
}

export async function rejectReview(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const supabase = await createClient();
  await supabase.from('reviews').update({ status: 'REJECTED' }).eq('id', id);
  await logAction({ action: 'reject', entity: 'reviews', entityId: id });
  revalidatePath(PATH);
}

export async function deleteReview(fd: FormData): Promise<void> {
  const me = await permittedActor(PERM);
  if (!me) return;
  const id = str(fd, 'id');
  const supabase = await createClient();
  await supabase.from('reviews').delete().eq('id', id);
  await logAction({ action: 'delete', entity: 'reviews', entityId: id });
  revalidatePath(PATH);
}
