#!/usr/bin/env node
/**
 * Bootstrap the first admin (owner). Creates the Supabase Auth user (or reuses
 * an existing one) and upserts the matching admin_users row with role 'owner'.
 *
 * Requires the SERVICE ROLE key — run it locally / in CI, never in the browser.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   ADMIN_EMAIL=owner@velmor.ly ADMIN_PASSWORD='strong-pass' ADMIN_NAME='Owner' \
 *   node scripts/create-admin.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_NAME || 'Owner';

if (!url || !serviceKey || !email || !password) {
  console.error(
    'ERROR: set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL and ADMIN_PASSWORD.'
  );
  process.exit(1);
}
if (String(password).length < 8) {
  console.error('ERROR: ADMIN_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function findUserByEmail(targetEmail) {
  // Paginate the user list to locate an existing account.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => (u.email || '').toLowerCase() === targetEmail.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  let userId;
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    // Likely already exists — reuse it and (optionally) reset the password.
    const existing = await findUserByEmail(email);
    if (!existing) throw error;
    userId = existing.id;
    // Reset the password AND force the email to confirmed — an unconfirmed
    // email is the most common reason signInWithPassword rejects a valid login.
    await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
    console.log(`Reused existing auth user for ${email} (password reset, email confirmed).`);
  } else {
    userId = created.user.id;
    console.log(`Created auth user for ${email}.`);
  }

  const { error: upsertErr } = await supabase
    .from('admin_users')
    .upsert(
      { id: userId, full_name: fullName, role: 'owner', permissions: [], active: true },
      { onConflict: 'id' }
    );
  if (upsertErr) throw upsertErr;

  console.log(`✅ Owner ready: ${email}  (sign in at /admin/login)`);
}

main().catch((e) => {
  console.error('Failed to create admin:', e.message ?? e);
  process.exit(1);
});
