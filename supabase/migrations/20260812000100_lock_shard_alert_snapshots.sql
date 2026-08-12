revoke all on table public.shard_alert_snapshots from public, anon, authenticated;

grant select, insert, update, delete on table public.shard_alert_snapshots to service_role;

create policy "Service role manages shard alert snapshots"
  on public.shard_alert_snapshots
  for all
  to service_role
  using (true)
  with check (true);
