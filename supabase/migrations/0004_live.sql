-- Live event state shared between the host console and the big screen window.
-- One row per event; the host console writes it, the projector page reads it over realtime.
create table if not exists live_state (
  event_id uuid primary key references events on delete cascade,
  screen_mode text not null default 'questions' check (screen_mode in ('questions', 'join', 'blank')),
  updated_at timestamptz default now()
);

alter table live_state enable row level security;

drop policy if exists "live state is public" on live_state;
create policy "live state is public" on live_state for select using (true);
drop policy if exists "team starts live state" on live_state;
create policy "team starts live state" on live_state for insert to authenticated with check (is_team());
drop policy if exists "team updates live state" on live_state;
create policy "team updates live state" on live_state for update to authenticated using (is_team()) with check (is_team());

grant select on live_state to anon, authenticated;
grant insert, update on live_state to authenticated;

do $$ begin
  alter publication supabase_realtime add table live_state;
exception when duplicate_object then null;
end $$;
