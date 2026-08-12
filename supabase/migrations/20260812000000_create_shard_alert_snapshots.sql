create table if not exists public.shard_alert_snapshots (
  id text primary key check (id = 'current'),
  last_updated bigint not null,
  captured_at timestamptz not null default timezone('utc', now()),
  direct_count integer not null check (direct_count >= 0),
  alerts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.shard_alert_snapshots enable row level security;

revoke all on table public.shard_alert_snapshots from anon, authenticated;
grant select, insert, update, delete on table public.shard_alert_snapshots to service_role;
