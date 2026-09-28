-- =============================================================================
-- 0017 — Add the 'admin' staff role
-- =============================================================================
-- Kept in its own migration: a new enum value cannot be referenced in the same
-- transaction that adds it (0018 uses it).
--
-- Role ladder:  owner  >  admin  >  manager  >  staff
--   owner   — everything, including admin-account management.
--   admin   — every store permission (like owner) but cannot manage admin
--             accounts or change another admin's role.
--   manager / staff — granular permissions from admin_users.permissions.

alter type admin_role add value if not exists 'admin' after 'owner';
