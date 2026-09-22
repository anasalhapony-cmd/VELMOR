-- =============================================================================
-- 0002 — Admin identity, authorization helpers, and store settings
-- =============================================================================

-- Admin accounts map 1:1 to Supabase auth users. A single 'owner' is enough at
-- launch; the role + permissions array support future staff roles without a
-- schema change.
create table admin_users (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null default '',
  role         admin_role not null default 'staff',
  permissions  text[] not null default '{}',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_admin_users_updated before update on admin_users
  for each row execute function set_updated_at();

-- is_admin(): true when the current user is an active admin.
-- SECURITY DEFINER so it can read admin_users irrespective of the caller's RLS
-- (prevents recursive policy evaluation). Locked search_path.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users a
    where a.id = auth.uid() and a.active
  );
$$;

-- has_permission(): owners implicitly have every permission.
create or replace function has_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users a
    where a.id = auth.uid()
      and a.active
      and (a.role = 'owner' or perm = any(a.permissions))
  );
$$;

-- ---------------------------------------------------------------------------
-- Store settings — a single typed key/value table. The app reads these at
-- runtime; the admin edits them. Grouped for the settings UI.
-- ---------------------------------------------------------------------------
create table site_settings (
  key         text primary key,
  value       jsonb not null,
  group_name  text not null default 'general',
  label       text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id)
);
create trigger trg_site_settings_updated before update on site_settings
  for each row execute function set_updated_at();

create or replace function get_setting(p_key text)
returns jsonb
language sql
stable
as $$
  select value from site_settings where key = p_key;
$$;
