-- =============================================================================
-- LOCAL TEST SHIM — NOT part of the application. Never run on Supabase.
-- Recreates the minimal Supabase-provided objects (auth schema, auth.uid(),
-- the anon/authenticated/service_role roles) so the real migrations in
-- supabase/migrations can be applied and RLS verified on a vanilla Postgres.
-- Supabase provides all of this for you in a real project.
-- =============================================================================

create schema if not exists auth;

-- Roles Supabase policies target.
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticator') then
    create role authenticator noinherit login password 'authpass';
  end if;
end $$;

grant anon, authenticated, service_role to authenticator;
grant usage on schema auth to anon, authenticated, service_role;

-- Minimal auth.users (Supabase's real table has many more columns).
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

-- auth.uid(): read the 'sub' claim from the request GUC (what Supabase does).
create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')
  )::uuid;
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

create or replace function auth.email() returns text
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.email', true), '');
$$;
