-- QueuePro database schema.
-- Run once: Supabase dashboard → SQL Editor → New query → paste this whole file → Run. Safe to re-run.

-- ─── Tables ─────────────────────────────────────────────────────────────────────────────────────────────

-- Staff members and what they can do. The app seeds these rows on first sign-in.
create table if not exists public.staff (
  id          text primary key,                 -- e.g. 'patel'
  name        text not null,
  service_ids text[] not null default '{}',     -- services they're qualified for, e.g. {consult,followup}
  avatar      text,
  break_until timestamptz,                      -- on break until this time (null = not on break)
  sort_order  int not null default 0            -- display order on the dashboard
);

-- One row per ticket, for its whole life: waiting → serving → completed / no-show / cancelled.
-- Keeping finished visits (instead of deleting them) is what lets the app learn real service durations.
create table if not exists public.visits (
  id             text primary key,              -- ticket number, e.g. 'A027'
  name           text not null,                 -- personal data: never readable by the public (see RLS below)
  service_id     text not null,
  priority       text not null default 'normal' check (priority in ('normal', 'priority', 'urgent')),
  arrived_at     timestamptz not null,
  appointment_at timestamptz,
  status         text not null default 'waiting' check (status in ('waiting', 'serving', 'completed', 'no-show', 'cancelled')),
  staff_id       text references public.staff (id),
  started_at     timestamptz,
  expected_end   timestamptz,
  ended_at       timestamptz,
  -- the database itself refuses inconsistent rows, whatever the app does
  constraint serving_needs_staff check (status <> 'serving' or (staff_id is not null and started_at is not null and expected_end is not null)),
  constraint finished_needs_end check (status in ('waiting', 'serving') or ended_at is not null)
);

-- Index: the app constantly asks "who is waiting / serving?", so let Postgres find those rows without scanning everything.
create index if not exists visits_status_idx on public.visits (status);

-- Partial unique index: a staff member can be serving AT MOST ONE visit at a time.
-- If two front desks click "serve" for the same doctor at the same moment, the second write fails here.
create unique index if not exists one_serving_per_staff on public.visits (staff_id) where status = 'serving';

-- The privacy-safe snapshot for the waiting-room screen (ticket numbers, positions, waits — no names).
-- Always exactly one row (id = 1); the dashboard overwrites it whenever the queue changes.
create table if not exists public.public_display (
  id         int primary key default 1 check (id = 1),
  view       jsonb not null,
  updated_at timestamptz not null default now()
);

-- ─── Row Level Security ─────────────────────────────────────────────────────────────────────────────────
-- The anon key is visible in the browser, so the DATABASE must decide who can see what.
-- With RLS on and no matching policy, a query returns nothing (reads) or is rejected (writes).

alter table public.staff          enable row level security;
alter table public.visits         enable row level security;
alter table public.public_display enable row level security;

-- Private tables: only signed-in staff ('authenticated' role) can read or change them.
drop policy if exists "staff: signed-in staff only" on public.staff;
create policy "staff: signed-in staff only" on public.staff
  for all to authenticated using (true) with check (true);

drop policy if exists "visits: signed-in staff only" on public.visits;
create policy "visits: signed-in staff only" on public.visits
  for all to authenticated using (true) with check (true);

-- Public snapshot: anyone may READ it (that's the TV); only signed-in staff may WRITE it.
drop policy if exists "display: anyone can read" on public.public_display;
create policy "display: anyone can read" on public.public_display
  for select to anon, authenticated using (true);

drop policy if exists "display: staff can publish" on public.public_display;
create policy "display: staff can publish" on public.public_display
  for insert to authenticated with check (true);

drop policy if exists "display: staff can update" on public.public_display;
create policy "display: staff can update" on public.public_display
  for update to authenticated using (true) with check (true);

-- ─── Realtime ───────────────────────────────────────────────────────────────────────────────────────────
-- Broadcast row changes to subscribed browsers. Realtime respects RLS: the TV (anon) only ever
-- receives public_display changes; dashboards (signed in) also receive visits/staff changes.
do $$
begin
  alter publication supabase_realtime add table public.visits, public.staff, public.public_display;
exception when duplicate_object then null; -- already added on a previous run
end $$;
