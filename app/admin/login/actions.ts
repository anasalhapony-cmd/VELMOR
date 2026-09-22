'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fail, type FormState } from '@/lib/admin/form-state';
import { rateLimit } from '@/lib/security/rate-limit';
import { headers } from 'next/headers';

/** Only allow same-app admin redirects (no open-redirect). */
function safeDest(raw: string | null): string {
  if (raw && raw.startsWith('/admin') && !raw.startsWith('/admin/login')) return raw;
  return '/admin';
}

/**
 * Admin sign-in. Verifies the credentials AND that the account is an active
 * admin (admin_users). A non-admin is signed straight back out so no admin
 * session can exist for a non-admin. On success the caller redirects.
 */
export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return fail('يرجى إدخال البريد وكلمة المرور.');

  // Basic brute-force blunting (per-IP). Not a substitute for Supabase's own.
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`admin-login:${ip}`, { limit: 10, windowMs: 5 * 60_000 });
  if (!rl.allowed) return fail('محاولات كثيرة. حاول بعد قليل.');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    // Surface the real reason (masking every auth error as "invalid" hides
    // common setup problems like an unconfirmed email).
    console.error('[admin-login] signIn failed:', error?.status, error?.code, error?.message);
    const code = error?.code ?? '';
    const msg = error?.message ?? '';
    if (code === 'email_not_confirmed' || /not confirmed/i.test(msg)) {
      return fail('البريد الإلكتروني غير مُفعّل. فعّله من Supabase → Authentication → Users، أو أنشئ الحساب عبر سكربت db:create-admin.');
    }
    return fail('بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.');
  }

  const { data: admin } = await supabase
    .from('admin_users')
    .select('id, active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!admin || !admin.active) {
    await supabase.auth.signOut();
    return fail('هذا الحساب لا يملك صلاحية الدخول للوحة التحكم.');
  }

  redirect(safeDest(String(formData.get('redirect') ?? '')));
}
