-- =============================================================================
-- 0010 — Analytics events, admin audit log, notification log
-- =============================================================================

-- Privacy-conscious event stream (no PII). High volume -> bigint identity.
create table analytics_events (
  id          bigint generated always as identity primary key,
  event_type  text not null,      -- product_viewed, search_performed, add_to_cart…
  product_id  uuid references products(id) on delete set null,
  session_id  text,               -- anonymous, rotating id (no personal data)
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index idx_analytics_type on analytics_events(event_type, created_at desc);
create index idx_analytics_product on analytics_events(product_id, created_at desc);
create index idx_analytics_created on analytics_events(created_at desc);

-- Append-only admin audit trail. RLS forbids UPDATE/DELETE entirely.
create table admin_audit_logs (
  id             bigint generated always as identity primary key,
  admin_id       uuid references auth.users(id),
  action         text not null,          -- create/update/delete/status_change…
  entity         text not null,          -- table/domain name
  entity_id      text,
  previous_value jsonb,
  new_value      jsonb,
  reason         text,
  created_at     timestamptz not null default now()
);
create index idx_audit_entity on admin_audit_logs(entity, entity_id, created_at desc);
create index idx_audit_admin  on admin_audit_logs(admin_id, created_at desc);

-- Notification outbox (WhatsApp/SMS/Email abstraction). No provider is wired at
-- launch; rows are recorded for future delivery + abandoned-cart analytics.
create table notification_logs (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references orders(id) on delete set null,
  channel    text not null,     -- WHATSAPP / SMS / EMAIL
  event      text not null,     -- order_received / confirmed / out_for_delivery…
  status     text not null default 'QUEUED',  -- QUEUED / SENT / FAILED
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_notif_order on notification_logs(order_id);
