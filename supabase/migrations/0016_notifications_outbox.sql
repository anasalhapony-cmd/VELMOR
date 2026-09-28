-- =============================================================================
-- 0016 — Notification outbox (queue rows on every order status change)
-- =============================================================================
-- §93: a provider-agnostic notification abstraction. No provider is wired at
-- launch — we simply RECORD a QUEUED row per status transition (including the
-- initial PENDING written by create_order). A future worker reads these and
-- sends via WhatsApp/SMS/Email, then flips status to SENT/FAILED. Decoupled via
-- a trigger so the atomic order engine (create_order) is untouched.

create or replace function trg_notify_on_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event text;
  v_notify boolean;
begin
  -- Map order status -> customer-facing notification event.
  v_event := case new.to_status
    when 'PENDING'            then 'order_received'
    when 'CONFIRMED'          then 'order_confirmed'
    when 'PREPARING'          then 'order_preparing'
    when 'READY_FOR_DELIVERY' then 'order_ready'
    when 'OUT_FOR_DELIVERY'   then 'order_out_for_delivery'
    when 'DELIVERED'          then 'order_delivered'
    when 'CANCELLED'          then 'order_cancelled'
    when 'FAILED'             then 'order_failed'
    else null
  end;

  -- Respect a global toggle if present (defaults to on). jsonb has no direct
  -- boolean cast, so compare against the jsonb literal true.
  v_notify := coalesce(get_setting('notifications_enabled') = 'true'::jsonb, true);

  if v_event is not null and v_notify then
    insert into notification_logs (order_id, channel, event, status, payload)
    values (
      new.order_id, 'WHATSAPP', v_event, 'QUEUED',
      jsonb_build_object('to_status', new.to_status, 'from_status', new.from_status)
    );
  end if;
  return new;
end;
$$;

create trigger trg_order_status_notify
  after insert on order_status_history
  for each row execute function trg_notify_on_status();
